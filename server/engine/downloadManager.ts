/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import type {
  BandwidthPoint,
  ChecksumAlgorithm,
  DashboardSnapshot,
  DownloadItem,
  DownloadSegment,
} from '../../src/shared/types.ts';
import { NovaDatabase } from '../db.ts';
import {
  redactSecrets,
  resolveSafePath,
  resolveSafeRealPath,
  sanitizeFilename,
  validateDownloadUrlWithDns,
} from '../security.ts';

export interface ProbeResult {
  url: string;
  finalUrl: string;
  filename: string;
  mimeType: string;
  totalBytes: number;
  supportsRanges: boolean;
  etag: string | null;
  suggestedCategory: string;
}

export interface CreateDownloadInput {
  url: string;
  filename?: string;
  category?: string;
  queueId?: string;
  connections?: number;
  speedLimitKbps?: number | null;
  expectedChecksum?: string | null;
  expectedChecksumAlgo?: ChecksumAlgorithm | null;
  startImmediately?: boolean;
  priority?: number;
  mediaFormat?: string | null;
  mediaQuality?: string | null;
}

interface ActiveJobRuntime {
  downloadId: string;
  abortControllers: AbortController[];
  segmentControllers: Map<number, AbortController>;
  paused: boolean;
  cancelled: boolean;
  segmentSpeeds: Map<number, number>;
  lastFlushAt: number;
}

class TokenBucketPacer {
  private lastCheck = Date.now();
  private allowanceBytes = 0;

  public async consume(bytes: number, limitKbps: number | null): Promise<void> {
    if (!limitKbps || limitKbps <= 0) return;
    const rateBps = limitKbps * 1024;
    const now = Date.now();
    const elapsedSec = Math.max(0, (now - this.lastCheck) / 1000);
    this.lastCheck = now;
    this.allowanceBytes = Math.min(rateBps, this.allowanceBytes + elapsedSec * rateBps);
    this.allowanceBytes -= bytes;

    if (this.allowanceBytes < 0) {
      const waitMs = Math.min(1500, Math.ceil((-this.allowanceBytes / rateBps) * 1000));
      if (waitMs > 5) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }
}

export class DownloadManager extends EventEmitter {
  private readonly db: NovaDatabase;
  private readonly activeJobs = new Map<string, ActiveJobRuntime>();
  private readonly jobPromises = new Map<string, Promise<void>>();
  private readonly globalPacer = new TokenBucketPacer();
  private readonly bandwidthHistory: BandwidthPoint[] = [];
  private peakSpeedBps = 0;
  private localFixturesPort: number | undefined;
  private telemetryTimer: NodeJS.Timeout | null = null;
  private schedulerTimer: NodeJS.Timeout | null = null;
  private destroyed = false;

  constructor(db: NovaDatabase, options: { localFixturesPort?: number; startTimers?: boolean } = {}) {
    super();
    this.db = db;
    this.localFixturesPort = options.localFixturesPort;

    if (options.startTimers !== false) {
      this.startBackgroundTimers();
    }
  }

  public setLocalFixturesPort(port: number): void {
    this.localFixturesPort = port;
  }

  public getLocalFixturesPort(): number | undefined {
    return this.localFixturesPort;
  }

  private startBackgroundTimers(): void {
    this.telemetryTimer = setInterval(() => {
      this.recordBandwidthPoint();
      this.emit('snapshot', this.getSnapshot());
    }, 1000);

    this.schedulerTimer = setInterval(() => {
      this.evaluateSchedules();
      this.dispatchQueuedDownloads();
    }, 5000);
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.telemetryTimer) clearInterval(this.telemetryTimer);
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    for (const job of this.activeJobs.values()) {
      job.paused = true;
      for (const ac of job.abortControllers) ac.abort();
    }
    this.activeJobs.clear();
  }

  public async shutdown(timeoutMs = 2500): Promise<void> {
    this.destroy();
    const pending = Array.from(this.jobPromises.values());
    if (pending.length === 0) return;
    await Promise.race([
      Promise.allSettled(pending),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }

  private recordBandwidthPoint(): void {
    const downloads = this.db.getAllDownloads(false);
    let currentSpeedBps = 0;
    let activeCount = 0;
    for (const d of downloads) {
      if (d.status === 'downloading') {
        activeCount++;
        currentSpeedBps += d.speedBps;
      }
    }
    if (currentSpeedBps > this.peakSpeedBps) {
      this.peakSpeedBps = currentSpeedBps;
    }
    this.bandwidthHistory.push({
      timestamp: Date.now(),
      speedBps: currentSpeedBps,
      activeCount,
    });
    if (this.bandwidthHistory.length > 60) {
      this.bandwidthHistory.shift();
    }
  }

  public classifyCategory(filename: string): string {
    const ext = path.extname(filename).replace(/^\./, '').toLowerCase();
    const categories = this.db.getCategories();
    for (const cat of categories) {
      if (cat.extensions.includes(ext)) {
        return cat.id;
      }
    }
    return 'other';
  }

  private extractFilenameFromHeaders(urlStr: string, disposition: string | null): string {
    if (disposition) {
      const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
      if (utf8Match?.[1]) {
        try {
          return sanitizeFilename(decodeURIComponent(utf8Match[1]));
        } catch {
          return sanitizeFilename(utf8Match[1]);
        }
      }
      const basicMatch = /filename="?([^";]+)"?/i.exec(disposition);
      if (basicMatch?.[1]) {
        return sanitizeFilename(basicMatch[1]);
      }
    }

    try {
      const parsed = new URL(urlStr);
      const base = path.basename(parsed.pathname);
      if (base && base !== '/') {
        return sanitizeFilename(decodeURIComponent(base));
      }
    } catch {
      // fall through
    }
    return `download_${Date.now()}.bin`;
  }

  private async fetchWithSafeRedirects(
    startUrl: string,
    init: RequestInit,
    maxRedirects = 5
  ): Promise<{ response: Response; finalUrl: string }> {
    const settings = this.db.getSettings();
    let currentUrl = startUrl;

    for (let hop = 0; hop <= maxRedirects; hop++) {
      const check = await validateDownloadUrlWithDns(currentUrl, {
        blockPrivateIps: settings.privacyBlockPrivateIps,
        allowLocalFixturesPort: this.localFixturesPort,
      });
      if (!check.valid || !check.normalizedUrl) {
        throw new Error(check.reason || 'Invalid URL');
      }

      const response = await fetch(check.normalizedUrl, {
        ...init,
        redirect: 'manual',
      });

      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`HTTP ${response.status} redirect missing Location header.`);
        }
        currentUrl = new URL(location, check.normalizedUrl).toString();
        continue;
      }

      return { response, finalUrl: check.normalizedUrl };
    }

    throw new Error('Too many HTTP redirects (> 5).');
  }

  public async probeUrl(rawUrl: string): Promise<ProbeResult> {
    const settings = this.db.getSettings();
    const validation = await validateDownloadUrlWithDns(rawUrl, {
      blockPrivateIps: settings.privacyBlockPrivateIps,
      allowLocalFixturesPort: this.localFixturesPort,
    });
    if (!validation.valid || !validation.normalizedUrl) {
      throw new Error(validation.reason || 'Invalid download URL.');
    }

    let finalUrl = validation.normalizedUrl;
    let totalBytes = 0;
    let supportsRanges = false;
    let mimeType = 'application/octet-stream';
    let disposition: string | null = null;
    let etag: string | null = null;

    try {
      const headRes = await this.fetchWithSafeRedirects(finalUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(12000),
      });
      finalUrl = headRes.finalUrl;

      if (headRes.response.ok) {
        const cl = headRes.response.headers.get('content-length');
        totalBytes = cl ? Number(cl) : 0;
        const acceptRanges = (headRes.response.headers.get('accept-ranges') || '').toLowerCase();
        supportsRanges = acceptRanges.includes('bytes') && totalBytes > 0;
        mimeType = headRes.response.headers.get('content-type')?.split(';')[0]?.trim() || mimeType;
        disposition = headRes.response.headers.get('content-disposition');
        etag = headRes.response.headers.get('etag');
      } else if (headRes.response.status === 405 || headRes.response.status === 501) {
        // Fallback probe with Range: bytes=0-0
        const rangeProbe = await this.fetchWithSafeRedirects(finalUrl, {
          method: 'GET',
          headers: { Range: 'bytes=0-0' },
          signal: AbortSignal.timeout(12000),
        });
        finalUrl = rangeProbe.finalUrl;
        await rangeProbe.response.body?.cancel();

        if (!rangeProbe.response.ok && rangeProbe.response.status !== 206) {
          throw new Error(`Server returned HTTP ${rangeProbe.response.status}`);
        }
        const cr = rangeProbe.response.headers.get('content-range');
        if (rangeProbe.response.status === 206 && cr) {
          const match = /bytes \d+-\d+\/(\d+)/i.exec(cr);
          totalBytes = match?.[1] ? Number(match[1]) : 0;
          supportsRanges = totalBytes > 0;
        } else {
          totalBytes = Number(rangeProbe.response.headers.get('content-length') || '0');
          supportsRanges = false;
        }
        mimeType = rangeProbe.response.headers.get('content-type')?.split(';')[0]?.trim() || mimeType;
        disposition = rangeProbe.response.headers.get('content-disposition');
        etag = rangeProbe.response.headers.get('etag');
      } else {
        throw new Error(`Probe failed with HTTP ${headRes.response.status}`);
      }
    } catch (err) {
      throw new Error(redactSecrets((err as Error).message));
    }

    const filename = this.extractFilenameFromHeaders(finalUrl, disposition);
    const suggestedCategory = this.classifyCategory(filename);

    return {
      url: validation.normalizedUrl,
      finalUrl,
      filename,
      mimeType,
      totalBytes: Number.isFinite(totalBytes) ? totalBytes : 0,
      supportsRanges,
      etag,
      suggestedCategory,
    };
  }

  private resolveUniqueDestination(destDir: string, filename: string): string {
    const safeName = sanitizeFilename(filename);
    const candidate = resolveSafePath(destDir, safeName);
    if (!fs.existsSync(candidate) && !fs.existsSync(`${candidate}.part`)) {
      return candidate;
    }

    const parsed = path.parse(safeName);
    for (let i = 1; i <= 999; i++) {
      const nextName = `${parsed.name} (${i})${parsed.ext}`;
      const nextPath = resolveSafePath(destDir, nextName);
      if (!fs.existsSync(nextPath) && !fs.existsSync(`${nextPath}.part`)) {
        return nextPath;
      }
    }
    return resolveSafePath(destDir, `${parsed.name}_${Date.now()}${parsed.ext}`);
  }

  public async createDownload(input: CreateDownloadInput): Promise<DownloadItem> {
    const settings = this.db.getSettings();
    const probe = await this.probeUrl(input.url);

    const requestedFilename = input.filename ? sanitizeFilename(input.filename) : probe.filename;
    const categoryId =
      input.category ||
      (settings.autoCategorize ? this.classifyCategory(requestedFilename) : 'other');
    const categories = this.db.getCategories();
    const catRule = categories.find((c) => c.id === categoryId) || categories.find((c) => c.id === 'other');

    const destDir = catRule && settings.autoCategorize
      ? resolveSafePath(this.db.downloadsDir, catRule.subfolder)
      : this.db.downloadsDir;

    fs.mkdirSync(destDir, { recursive: true });

    const finalFilePath = this.resolveUniqueDestination(destDir, requestedFilename);
    const finalFilename = path.basename(finalFilePath);
    const id = `dl_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const queueId = input.queueId || 'default';
    const queue = this.db.getQueues().find((q) => q.id === queueId);

    const requestedConns = Math.max(
      1,
      Math.min(16, input.connections ?? queue?.maxConnectionsPerDownload ?? settings.defaultConnections)
    );
    const actualConnections =
      probe.supportsRanges && probe.totalBytes >= 65536 ? requestedConns : 1;

    const now = new Date().toISOString();
    const item: DownloadItem = {
      id,
      url: probe.url,
      finalUrl: probe.finalUrl,
      filename: finalFilename,
      destinationDir: destDir,
      filePath: finalFilePath,
      category: categoryId,
      queueId,
      priority: input.priority ?? 0,
      mimeType: probe.mimeType,
      totalBytes: probe.totalBytes,
      downloadedBytes: 0,
      progress: 0,
      speedBps: 0,
      etaSeconds: null,
      status: 'queued',
      supportsRanges: probe.supportsRanges,
      connections: actualConnections,
      speedLimitKbps: input.speedLimitKbps ?? null,
      etag: probe.etag,
      expectedChecksum: input.expectedChecksum?.trim().toLowerCase() || null,
      expectedChecksumAlgo: input.expectedChecksum ? input.expectedChecksumAlgo || 'sha256' : null,
      actualSha256: null,
      actualSha512: null,
      checksumVerified: null,
      errorMessage: null,
      retryCount: 0,
      maxRetries: settings.maxRetries,
      mediaFormat: input.mediaFormat || null,
      mediaQuality: input.mediaQuality || null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    this.db.insertDownload(item);

    const segments = this.buildInitialSegments(id, item.totalBytes, actualConnections);
    this.db.replaceSegments(id, segments);
    this.db.addEvent(
      id,
      'info',
      `Created download (${actualConnections} connection${actualConnections > 1 ? 's' : ''}, ${
        probe.supportsRanges ? 'Range supported' : 'Single-stream fallback'
      }).`
    );

    if (input.startImmediately !== false) {
      await this.dispatchQueuedDownloads();
    }
    this.emit('snapshot', this.getSnapshot());
    return this.db.getDownload(id, true)!;
  }

  private buildInitialSegments(
    downloadId: string,
    totalBytes: number,
    connections: number
  ): Omit<DownloadSegment, 'id'>[] {
    if (totalBytes <= 0 || connections <= 1) {
      return [
        {
          downloadId,
          segmentIndex: 0,
          startByte: 0,
          endByte: totalBytes > 0 ? totalBytes - 1 : -1,
          downloadedBytes: 0,
          status: 'pending',
          speedBps: 0,
        },
      ];
    }

    const chunkSize = Math.floor(totalBytes / connections);
    const segments: Omit<DownloadSegment, 'id'>[] = [];
    for (let i = 0; i < connections; i++) {
      const startByte = i * chunkSize;
      const endByte = i === connections - 1 ? totalBytes - 1 : (i + 1) * chunkSize - 1;
      segments.push({
        downloadId,
        segmentIndex: i,
        startByte,
        endByte,
        downloadedBytes: 0,
        status: 'pending',
        speedBps: 0,
      });
    }
    return segments;
  }

  public async dispatchQueuedDownloads(): Promise<void> {
    const settings = this.db.getSettings();
    const queues = this.db.getQueues();
    const allDownloads = this.db.getAllDownloads(false);

    let globalActive = allDownloads.filter((d) => d.status === 'downloading' || d.status === 'verifying').length;
    if (globalActive >= settings.maxGlobalConcurrent) return;

    for (const queue of queues) {
      if (globalActive >= settings.maxGlobalConcurrent) break;
      const activeInQueue = allDownloads.filter(
        (d) => d.queueId === queue.id && (d.status === 'downloading' || d.status === 'verifying')
      ).length;
      if (activeInQueue >= queue.maxConcurrent) continue;

      const queuedInQueue = allDownloads
        .filter((d) => d.queueId === queue.id && d.status === 'queued')
        .sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt));

      const slots = Math.min(
        queue.maxConcurrent - activeInQueue,
        settings.maxGlobalConcurrent - globalActive
      );

      for (const nextItem of queuedInQueue.slice(0, slots)) {
        if (!this.activeJobs.has(nextItem.id)) {
          globalActive++;
          void this.runDownload(nextItem.id);
        }
      }
    }
  }

  public async startOrResumeDownload(id: string): Promise<DownloadItem | null> {
    const item = this.db.getDownload(id, true);
    if (!item) return null;
    if (item.status === 'completed' || this.activeJobs.has(id)) return item;

    this.db.updateDownload(id, { status: 'queued', errorMessage: null });
    this.db.addEvent(id, 'info', 'Queued to start/resume transfer.');
    void this.runDownload(id);
    this.emit('snapshot', this.getSnapshot());
    return this.db.getDownload(id, true);
  }

  public async pauseDownload(id: string): Promise<DownloadItem | null> {
    const job = this.activeJobs.get(id);
    if (job) {
      job.paused = true;
      for (const ac of job.abortControllers) ac.abort();
      this.activeJobs.delete(id);
    }
    const existing = this.db.getDownload(id, true);
    if (!existing) return null;

    if (existing.status !== 'completed' && existing.status !== 'cancelled') {
      this.db.updateDownload(id, { status: 'paused', speedBps: 0, etaSeconds: null });
      const segs = this.db.getSegments(id);
      for (const s of segs) {
        if (s.status === 'active') {
          this.db.updateSegmentProgress(id, s.segmentIndex, s.downloadedBytes, 'paused', 0);
        }
      }
      this.db.addEvent(id, 'info', 'Download paused; segment byte offsets preserved.');
    }
    this.emit('snapshot', this.getSnapshot());
    void this.dispatchQueuedDownloads();
    return this.db.getDownload(id, true);
  }

  public async cancelDownload(id: string): Promise<DownloadItem | null> {
    const job = this.activeJobs.get(id);
    if (job) {
      job.cancelled = true;
      for (const ac of job.abortControllers) ac.abort();
      this.activeJobs.delete(id);
    }

    const existing = this.db.getDownload(id, true);
    if (!existing) return null;

    const partPath = `${existing.filePath}.part`;
    await fsp.rm(partPath, { force: true }).catch(() => {});

    this.db.updateDownload(id, {
      status: 'cancelled',
      speedBps: 0,
      etaSeconds: null,
    });
    this.db.addEvent(id, 'warn', 'Download cancelled and partial file cleaned up.');
    this.emit('snapshot', this.getSnapshot());
    void this.dispatchQueuedDownloads();
    return this.db.getDownload(id, true);
  }

  public async retryDownload(id: string): Promise<DownloadItem | null> {
    const existing = this.db.getDownload(id, true);
    if (!existing) return null;

    const partPath = `${existing.filePath}.part`;
    await fsp.rm(partPath, { force: true }).catch(() => {});

    const segments = this.buildInitialSegments(id, existing.totalBytes, existing.connections);
    this.db.replaceSegments(id, segments);
    this.db.updateDownload(id, {
      status: 'queued',
      downloadedBytes: 0,
      progress: 0,
      speedBps: 0,
      etaSeconds: null,
      errorMessage: null,
      retryCount: 0,
    });
    this.db.addEvent(id, 'info', 'Reset download segments for fresh retry.');
    void this.runDownload(id);
    this.emit('snapshot', this.getSnapshot());
    return this.db.getDownload(id, true);
  }

  public async pauseAll(): Promise<void> {
    const all = this.db.getAllDownloads(false);
    for (const item of all) {
      if (item.status === 'downloading' || item.status === 'queued') {
        await this.pauseDownload(item.id);
      }
    }
  }

  public async resumeAll(): Promise<void> {
    const all = this.db.getAllDownloads(false);
    for (const item of all) {
      if (item.status === 'paused' || item.status === 'failed') {
        this.db.updateDownload(item.id, { status: 'queued', errorMessage: null });
      }
    }
    await this.dispatchQueuedDownloads();
    this.emit('snapshot', this.getSnapshot());
  }

  private async runDownload(id: string): Promise<void> {
    if (this.activeJobs.has(id)) return;
    const item = this.db.getDownload(id, true);
    if (!item || item.status === 'completed' || item.status === 'cancelled') return;

    const runtime: ActiveJobRuntime = {
      downloadId: id,
      abortControllers: [],
      segmentControllers: new Map(),
      paused: false,
      cancelled: false,
      segmentSpeeds: new Map(),
      lastFlushAt: Date.now(),
    };
    this.activeJobs.set(id, runtime);

    const jobPromise = (async () => {
      const partPath = `${item.filePath}.part`;
      let fileHandle: fsp.FileHandle | null = null;
      let consolidatedToSingleStream = false;

      try {
        resolveSafeRealPath(this.db.downloadsDir, path.relative(this.db.downloadsDir, item.destinationDir));
        fs.mkdirSync(item.destinationDir, { recursive: true });
        this.db.updateDownload(id, { status: 'downloading', errorMessage: null });

        if (!fs.existsSync(partPath)) {
          fileHandle = await fsp.open(partPath, 'w+');
          if (item.totalBytes > 0) {
            await fileHandle.truncate(item.totalBytes);
          }
        } else {
          fileHandle = await fsp.open(partPath, 'r+');
        }

        let segments = this.db.getSegments(id);
        if (segments.length === 0) {
          const built = this.buildInitialSegments(id, item.totalBytes, item.connections);
          this.db.replaceSegments(id, built);
          segments = this.db.getSegments(id);
        }

        // Check if single-stream non-range download had partial bytes; non-range servers require restart from 0
        if (!item.supportsRanges && segments[0] && segments[0].downloadedBytes > 0) {
          segments[0].downloadedBytes = 0;
          this.db.updateSegmentProgress(id, 0, 0, 'pending', 0);
          await fileHandle.truncate(0);
          this.db.addEvent(id, 'warn', 'Server lacks Range support; restarting stream from byte 0.');
        }

        const activeHandle = fileHandle;

        const runSegment = async (seg: DownloadSegment): Promise<void> => {
          try {
            if (seg.status === 'completed') return;
            let expectedLen = seg.endByte >= 0 ? seg.endByte - seg.startByte + 1 : -1;
            if (expectedLen > 0 && seg.downloadedBytes >= expectedLen) {
              this.db.updateSegmentProgress(id, seg.segmentIndex, seg.downloadedBytes, 'completed', 0);
              return;
            }
            if (expectedLen === 0 && item.totalBytes === 0 && seg.downloadedBytes === 0 && seg.segmentIndex > 0) {
              this.db.updateSegmentProgress(id, seg.segmentIndex, 0, 'completed', 0);
              return;
            }

            const ac = new AbortController();
            runtime.abortControllers.push(ac);
            runtime.segmentControllers.set(seg.segmentIndex, ac);
            const startPos = seg.startByte + seg.downloadedBytes;
            const headers: Record<string, string> = {};

            if (item.supportsRanges && seg.endByte >= 0) {
              headers['Range'] = `bytes=${startPos}-${seg.endByte}`;
              if (item.etag) headers['If-Range'] = item.etag;
            }

            this.db.updateSegmentProgress(id, seg.segmentIndex, seg.downloadedBytes, 'active', 0);

            const { response } = await this.fetchWithSafeRedirects(item.finalUrl, {
              method: 'GET',
              headers,
              signal: ac.signal,
            });

            if (!response.ok && response.status !== 206) {
              throw new Error(`Segment ${seg.segmentIndex} received HTTP ${response.status}`);
            }

            if (consolidatedToSingleStream && seg.segmentIndex > 0) {
              await response.body?.cancel();
              return;
            }

            // If server ignored Range (or If-Range mismatched ETag) and returned 200 OK
            let bytesWritten = seg.downloadedBytes;
            if (item.supportsRanges && response.status === 200) {
              if (seg.segmentIndex > 0) {
                await response.body?.cancel();
                return;
              }
              consolidatedToSingleStream = true;
              for (const [idx, ctrl] of runtime.segmentControllers.entries()) {
                if (idx !== 0) ctrl.abort();
              }
              bytesWritten = 0;
              seg.startByte = 0;
              await activeHandle.truncate(0);
              const clHeader = response.headers.get('content-length');
              const parsedCl = clHeader !== null ? Number(clHeader) : item.totalBytes;
              const nextTotal = Number.isFinite(parsedCl) && parsedCl >= 0 ? parsedCl : item.totalBytes;
              expectedLen = nextTotal > 0 ? nextTotal : -1;
              this.db.updateDownload(id, {
                supportsRanges: false,
                connections: 1,
                totalBytes: nextTotal,
                downloadedBytes: 0,
              });
              this.db.replaceSegments(id, [
                {
                  downloadId: id,
                  segmentIndex: 0,
                  startByte: 0,
                  endByte: nextTotal > 0 ? nextTotal - 1 : -1,
                  downloadedBytes: 0,
                  status: 'active',
                  speedBps: 0,
                },
              ]);
              this.db.addEvent(
                id,
                'warn',
                'Origin returned HTTP 200 instead of 206; consolidated transfer to single stream from byte 0.'
              );
            } else if (response.status === 206 && seg.downloadedBytes > 0 && item.etag) {
              const respEtag = response.headers.get('etag');
              if (respEtag && respEtag !== item.etag) {
                await response.body?.cancel();
                throw new Error(`Origin ETag changed mid-resume (expected ${item.etag}, got ${respEtag}).`);
              }
            } else if (response.status === 200 && seg.segmentIndex === 0) {
              const clHeader = response.headers.get('content-length');
              const parsedCl = clHeader !== null ? Number(clHeader) : NaN;
              if (Number.isFinite(parsedCl) && parsedCl >= 0) {
                if (item.totalBytes === 0 && parsedCl > 0) {
                  this.db.updateDownload(id, { totalBytes: parsedCl });
                } else if (item.totalBytes > 0 && parsedCl !== item.totalBytes) {
                  await response.body?.cancel();
                  throw new Error(
                    `Content-Length mismatch: probed ${item.totalBytes} bytes, server declared ${parsedCl} bytes.`
                  );
                }
              }
            }

            if (!response.body) {
              // Empty body is valid for 0-byte files when Content-Length: 0
              const clZero = response.headers.get('content-length') === '0';
              if (clZero || item.totalBytes === 0) {
                runtime.segmentSpeeds.set(seg.segmentIndex, 0);
                this.db.updateSegmentProgress(id, seg.segmentIndex, bytesWritten, 'completed', 0);
                this.flushAggregateProgress(id, runtime);
                return;
              }
              throw new Error('Response body is empty.');
            }

            const reader = response.body.getReader();
            let windowBytes = 0;
            let windowStart = Date.now();
            const segPacer = new TokenBucketPacer();

            while (true) {
              if (runtime.paused || runtime.cancelled || (consolidatedToSingleStream && seg.segmentIndex > 0)) {
                await reader.cancel();
                break;
              }

              const { done, value } = await reader.read();
              if (done) break;
              if (!value || value.length === 0) continue;

              const settings = this.db.getSettings();
              const queue = this.db.getQueues().find((q) => q.id === item.queueId);
              const effectiveDlLimit = item.speedLimitKbps ?? queue?.speedLimitKbps ?? null;
              if (effectiveDlLimit) {
                const perConnLimit = Math.max(8, Math.floor(effectiveDlLimit / Math.max(1, item.connections)));
                await segPacer.consume(value.length, perConnLimit);
              }
              if (settings.globalSpeedLimitKbps) {
                await this.globalPacer.consume(value.length, settings.globalSpeedLimitKbps);
              }

              let chunkToWrite = value;
              if (expectedLen >= 0 && bytesWritten + chunkToWrite.length > expectedLen) {
                const remaining = expectedLen - bytesWritten;
                if (remaining <= 0) break;
                chunkToWrite = chunkToWrite.subarray(0, remaining);
              }

              const writeOffset = seg.startByte + bytesWritten;
              await activeHandle.write(chunkToWrite, 0, chunkToWrite.length, writeOffset);
              bytesWritten += chunkToWrite.length;
              windowBytes += chunkToWrite.length;

              const now = Date.now();
              const elapsed = now - windowStart;
              if (elapsed >= 350) {
                const segSpeed = Math.round((windowBytes / elapsed) * 1000);
                runtime.segmentSpeeds.set(seg.segmentIndex, segSpeed);
                this.db.updateSegmentProgress(id, seg.segmentIndex, bytesWritten, 'active', segSpeed);
                windowBytes = 0;
                windowStart = now;
                this.flushAggregateProgress(id, runtime);
              }
            }

            if (consolidatedToSingleStream && seg.segmentIndex > 0) {
              return;
            }

            if (runtime.paused || runtime.cancelled) {
              runtime.segmentSpeeds.set(seg.segmentIndex, 0);
              this.db.updateSegmentProgress(
                id,
                seg.segmentIndex,
                bytesWritten,
                runtime.paused ? 'paused' : 'error',
                0
              );
              return;
            }

            if (expectedLen > 0 && bytesWritten < expectedLen) {
              throw new Error(
                `Truncated transfer: segment ${seg.segmentIndex} expected ${expectedLen} bytes, received ${bytesWritten} bytes.`
              );
            }

            runtime.segmentSpeeds.set(seg.segmentIndex, 0);
            this.db.updateSegmentProgress(id, seg.segmentIndex, bytesWritten, 'completed', 0);
            this.flushAggregateProgress(id, runtime);
          } catch (segErr) {
            if (consolidatedToSingleStream && seg.segmentIndex > 0) {
              return;
            }
            throw segErr;
          }
        };

        await Promise.all(segments.map((s) => runSegment(s)));

        await fileHandle.sync();
        await fileHandle.close();
        fileHandle = null;

        if (runtime.paused || runtime.cancelled) {
          return;
        }

        // Compute cryptographic hashes and verify integrity
        this.db.updateDownload(id, { status: 'verifying', speedBps: 0, etaSeconds: 0 });
        this.emit('snapshot', this.getSnapshot());

        const { sha256, sha512, byteSize } = await this.computeHashes(partPath);
        const latest = this.db.getDownload(id, false)!;

        if (latest.totalBytes > 0 && byteSize !== latest.totalBytes) {
          throw new Error(`Size mismatch: expected ${latest.totalBytes} bytes, received ${byteSize} bytes.`);
        }

        let checksumVerified: boolean | null = null;
        if (latest.expectedChecksum) {
          const targetHash = latest.expectedChecksumAlgo === 'sha512' ? sha512 : sha256;
          checksumVerified = targetHash.toLowerCase() === latest.expectedChecksum.toLowerCase();
          if (!checksumVerified) {
            throw new Error(
              `Checksum mismatch (${latest.expectedChecksumAlgo?.toUpperCase()}): expected ${latest.expectedChecksum}, got ${targetHash}.`
            );
          }
        }

        await fsp.rename(partPath, latest.filePath);

        this.db.updateDownload(id, {
          status: 'completed',
          downloadedBytes: byteSize,
          totalBytes: latest.totalBytes > 0 ? latest.totalBytes : byteSize,
          progress: 100,
          speedBps: 0,
          etaSeconds: 0,
          actualSha256: sha256,
          actualSha512: sha512,
          checksumVerified,
          completedAt: new Date().toISOString(),
        });

        this.db.addEvent(
          id,
          'success',
          `Completed (${byteSize} bytes). SHA-256: ${sha256.slice(0, 16)}…${
            checksumVerified ? ' [Checksum Verified]' : ''
          }`
        );
      } catch (err) {
        if (fileHandle) {
          await fileHandle.close().catch(() => {});
        }

        if (runtime.paused || runtime.cancelled || (err as Error).name === 'AbortError') {
          return;
        }

        const current = this.db.getDownload(id, false);
        const settings = this.db.getSettings();
        const errCode = (err as NodeJS.ErrnoException)?.code;
        let rawMessage = (err as Error).message || 'Download failed';
        if (errCode === 'ENOSPC') {
          rawMessage = 'Insufficient disk space while writing download file (ENOSPC).';
        } else if (errCode === 'EACCES' || errCode === 'EPERM' || errCode === 'EROFS') {
          rawMessage = `Filesystem permission denied while writing download (${errCode}).`;
        }
        const message = redactSecrets(rawMessage);

        if (current && settings.autoRetry && current.retryCount < current.maxRetries) {
          const nextRetry = current.retryCount + 1;
          this.db.updateDownload(id, {
            status: 'queued',
            retryCount: nextRetry,
            speedBps: 0,
            errorMessage: `Retry ${nextRetry}/${current.maxRetries}: ${message}`,
          });
          this.db.addEvent(
            id,
            'warn',
            `Transient error (${message}); scheduling retry ${nextRetry}/${current.maxRetries}.`
          );
          setTimeout(() => {
            if (!this.destroyed) {
              void this.dispatchQueuedDownloads();
            }
          }, Math.min(8000, 1000 * 2 ** nextRetry));
        } else {
          if (
            message.includes('Checksum mismatch') ||
            message.includes('Size mismatch') ||
            message.includes('Content-Length mismatch') ||
            message.includes('Truncated transfer')
          ) {
            await fsp.rm(partPath, { force: true }).catch(() => {});
          }
          this.db.updateDownload(id, {
            status: 'failed',
            speedBps: 0,
            etaSeconds: null,
            errorMessage: message,
          });
          this.db.addEvent(id, 'error', `Failed: ${message}`);
        }
      } finally {
        this.activeJobs.delete(id);
        if (!this.destroyed) {
          this.emit('snapshot', this.getSnapshot());
          void this.dispatchQueuedDownloads();
        }
      }
    })();

    this.jobPromises.set(id, jobPromise);
    try {
      await jobPromise;
    } finally {
      this.jobPromises.delete(id);
    }
  }

  private flushAggregateProgress(downloadId: string, runtime: ActiveJobRuntime): void {
    const segs = this.db.getSegments(downloadId);
    const dl = this.db.getDownload(downloadId, false);
    if (!dl) return;

    const downloadedBytes = segs.reduce((acc, s) => acc + s.downloadedBytes, 0);
    const totalSpeed = Array.from(runtime.segmentSpeeds.values()).reduce((a, b) => a + b, 0);
    const progress =
      dl.totalBytes > 0 ? Math.min(100, Number(((downloadedBytes / dl.totalBytes) * 100).toFixed(2))) : 0;
    const remaining = Math.max(0, dl.totalBytes - downloadedBytes);
    const etaSeconds = totalSpeed > 0 && dl.totalBytes > 0 ? Math.ceil(remaining / totalSpeed) : null;

    this.db.updateDownload(downloadId, {
      downloadedBytes,
      progress,
      speedBps: totalSpeed,
      etaSeconds,
    });
  }

  public async computeHashes(
    filePath: string
  ): Promise<{ sha256: string; sha512: string; byteSize: number }> {
    return new Promise((resolve, reject) => {
      const h256 = crypto.createHash('sha256');
      const h512 = crypto.createHash('sha512');
      let byteSize = 0;

      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk: Buffer | string) => {
        const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
        byteSize += buf.length;
        h256.update(buf);
        h512.update(buf);
      });
      stream.on('end', () => {
        resolve({
          sha256: h256.digest('hex'),
          sha512: h512.digest('hex'),
          byteSize,
        });
      });
      stream.on('error', reject);
    });
  }

  private evaluateSchedules(): void {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const day = now.getDay();
    const todayKey = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM

    for (const sched of this.db.getSchedules()) {
      if (!sched.enabled) continue;
      if (!sched.daysOfWeek.includes(day)) continue;
      if (sched.cronTime !== hhmm) continue;
      if (sched.lastRunAt && sched.lastRunAt.startsWith(todayKey)) continue;

      this.db.upsertSchedule({ ...sched, lastRunAt: now.toISOString() });
      if (sched.action === 'start_queue') {
        for (const d of this.db.getAllDownloads(false)) {
          if (d.queueId === sched.queueId && d.status === 'paused') {
            this.db.updateDownload(d.id, { status: 'queued' });
          }
        }
        void this.dispatchQueuedDownloads();
      } else if (sched.action === 'pause_queue') {
        for (const d of this.db.getAllDownloads(false)) {
          if (d.queueId === sched.queueId && (d.status === 'downloading' || d.status === 'queued')) {
            void this.pauseDownload(d.id);
          }
        }
      } else if (sched.action === 'limit_speed') {
        const settings = this.db.getSettings();
        this.db.saveSettings({ ...settings, globalSpeedLimitKbps: sched.speedLimitKbps });
      }
      this.emit('snapshot', this.getSnapshot());
    }
  }

  public getSnapshot(): DashboardSnapshot {
    const downloads = this.db.getAllDownloads(true);
    const queues = this.db.getQueues().map((q) => ({
      ...q,
      activeCount: downloads.filter((d) => d.queueId === q.id && d.status === 'downloading').length,
      queuedCount: downloads.filter((d) => d.queueId === q.id && d.status === 'queued').length,
    }));

    const stats = {
      currentSpeedBps: downloads
        .filter((d) => d.status === 'downloading')
        .reduce((acc, d) => acc + d.speedBps, 0),
      peakSpeedBps: this.peakSpeedBps,
      totalDownloadedBytes: downloads.reduce((acc, d) => acc + d.downloadedBytes, 0),
      activeCount: downloads.filter((d) => d.status === 'downloading' || d.status === 'verifying').length,
      queuedCount: downloads.filter((d) => d.status === 'queued').length,
      pausedCount: downloads.filter((d) => d.status === 'paused').length,
      completedCount: downloads.filter((d) => d.status === 'completed').length,
      failedCount: downloads.filter((d) => d.status === 'failed').length,
    };

    return {
      downloads,
      queues,
      categories: this.db.getCategories(),
      schedules: this.db.getSchedules(),
      settings: this.db.getSettings(),
      bandwidthHistory: [...this.bandwidthHistory],
      stats,
    };
  }
}
