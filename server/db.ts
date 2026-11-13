/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  AiHistoryEntry,
  AppSettings,
  CategoryRule,
  DownloadEvent,
  DownloadItem,
  DownloadSegment,
  PluginDescriptor,
  QueueConfig,
  ScheduleRule,
} from '../src/shared/types.ts';
import { generateBridgeToken } from './security.ts';

export class NovaDatabase {
  public readonly db: DatabaseSync;
  public readonly dataDir: string;
  public readonly downloadsDir: string;

  constructor(customDataDir?: string) {
    this.dataDir = path.resolve(
      customDataDir || process.env.NOVALOAD_DATA_DIR || path.join(process.cwd(), '.novaload')
    );
    this.downloadsDir = path.join(this.dataDir, 'downloads');
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.mkdirSync(this.downloadsDir, { recursive: true });

    const dbPath = path.join(this.dataDir, 'novaload.db');
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.runMigrations();
    this.seedDefaults();
  }

  private runMigrations(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const applied = new Set<number>(
      (this.db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map(
        (r) => r.version
      )
    );

    const migrations: Array<{ version: number; name: string; sql: string }> = [
      {
        version: 1,
        name: 'initial_schema',
        sql: `
          CREATE TABLE IF NOT EXISTS queues (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            max_concurrent INTEGER NOT NULL DEFAULT 3,
            max_connections_per_download INTEGER NOT NULL DEFAULT 8,
            speed_limit_kbps INTEGER,
            is_default INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0
          );

          CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            subfolder TEXT NOT NULL,
            extensions_json TEXT NOT NULL,
            color_token TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS downloads (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            final_url TEXT NOT NULL,
            filename TEXT NOT NULL,
            destination_dir TEXT NOT NULL,
            file_path TEXT NOT NULL,
            category TEXT NOT NULL,
            queue_id TEXT NOT NULL,
            priority INTEGER NOT NULL DEFAULT 0,
            mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
            total_bytes INTEGER NOT NULL DEFAULT 0,
            downloaded_bytes INTEGER NOT NULL DEFAULT 0,
            progress REAL NOT NULL DEFAULT 0,
            speed_bps INTEGER NOT NULL DEFAULT 0,
            eta_seconds INTEGER,
            status TEXT NOT NULL,
            supports_ranges INTEGER NOT NULL DEFAULT 0,
            connections INTEGER NOT NULL DEFAULT 4,
            speed_limit_kbps INTEGER,
            etag TEXT,
            expected_checksum TEXT,
            expected_checksum_algo TEXT,
            actual_sha256 TEXT,
            actual_sha512 TEXT,
            checksum_verified INTEGER,
            error_message TEXT,
            retry_count INTEGER NOT NULL DEFAULT 0,
            max_retries INTEGER NOT NULL DEFAULT 3,
            media_format TEXT,
            media_quality TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT
          );

          CREATE TABLE IF NOT EXISTS download_segments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            download_id TEXT NOT NULL REFERENCES downloads(id) ON DELETE CASCADE,
            segment_index INTEGER NOT NULL,
            start_byte INTEGER NOT NULL,
            end_byte INTEGER NOT NULL,
            downloaded_bytes INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            speed_bps INTEGER NOT NULL DEFAULT 0
          );

          CREATE TABLE IF NOT EXISTS download_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            download_id TEXT NOT NULL REFERENCES downloads(id) ON DELETE CASCADE,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS schedules (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            queue_id TEXT NOT NULL,
            action TEXT NOT NULL,
            cron_time TEXT NOT NULL,
            days_json TEXT NOT NULL,
            speed_limit_kbps INTEGER,
            enabled INTEGER NOT NULL DEFAULT 1,
            last_run_at TEXT
          );

          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS ai_history (
            id TEXT PRIMARY KEY,
            prompt TEXT NOT NULL,
            model TEXT NOT NULL,
            summary TEXT NOT NULL,
            answer TEXT NOT NULL,
            proposed_actions_json TEXT NOT NULL,
            executed_count INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS plugins (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            version TEXT NOT NULL,
            category TEXT NOT NULL,
            author TEXT NOT NULL,
            description TEXT NOT NULL,
            permissions_json TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            built_in INTEGER NOT NULL DEFAULT 1
          );
        `,
      },
      {
        version: 2,
        name: 'indexes_and_browser_captures',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
          CREATE INDEX IF NOT EXISTS idx_downloads_queue ON downloads(queue_id, priority DESC);
          CREATE INDEX IF NOT EXISTS idx_segments_download ON download_segments(download_id, segment_index);
          CREATE TABLE IF NOT EXISTS browser_captures (
            id TEXT PRIMARY KEY,
            browser TEXT NOT NULL,
            url TEXT NOT NULL,
            filename TEXT,
            referrer TEXT,
            download_id TEXT,
            created_at TEXT NOT NULL
          );
        `,
      },
    ];

    for (const migration of migrations) {
      if (!applied.has(migration.version)) {
        this.db.exec('BEGIN');
        try {
          this.db.exec(migration.sql);
          this.db
            .prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
            .run(migration.version, migration.name, new Date().toISOString());
          this.db.exec('COMMIT');
        } catch (err) {
          this.db.exec('ROLLBACK');
          throw err;
        }
      }
    }
  }

  private seedDefaults(): void {
    const queueCount = (this.db.prepare('SELECT COUNT(*) as c FROM queues').get() as { c: number }).c;
    if (queueCount === 0) {
      const insertQ = this.db.prepare(
        `INSERT INTO queues (id, name, description, max_concurrent, max_connections_per_download, speed_limit_kbps, is_default, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      insertQ.run('default', 'Main Queue', 'Primary high-speed download queue', 3, 8, null, 1, 0);
      insertQ.run('media', 'Media & Video', 'Sequential queue tuned for video and audio streams', 2, 6, null, 0, 1);
      insertQ.run('night', 'Off-Peak Batch', 'Scheduled overnight bulk archive queue', 4, 8, 5120, 0, 2);
    }

    const catCount = (this.db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
    if (catCount === 0) {
      const insertCat = this.db.prepare(
        `INSERT INTO categories (id, name, subfolder, extensions_json, color_token) VALUES (?, ?, ?, ?, ?)`
      );
      const defaults: CategoryRule[] = [
        { id: 'software', name: 'Software', subfolder: 'Software', extensions: ['exe', 'msi', 'dmg', 'appimage', 'deb', 'rpm', 'iso', 'pkg'], colorToken: 'blue' },
        { id: 'archives', name: 'Archives', subfolder: 'Archives', extensions: ['zip', 'tar', 'gz', '7z', 'rar', 'xz', 'bz2', 'zst'], colorToken: 'amber' },
        { id: 'documents', name: 'Documents', subfolder: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv', 'json'], colorToken: 'emerald' },
        { id: 'video', name: 'Video', subfolder: 'Video', extensions: ['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v'], colorToken: 'violet' },
        { id: 'audio', name: 'Audio', subfolder: 'Audio', extensions: ['mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a', 'opus'], colorToken: 'cyan' },
        { id: 'images', name: 'Images', subfolder: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'avif'], colorToken: 'rose' },
        { id: 'other', name: 'Other', subfolder: 'Other', extensions: [], colorToken: 'slate' },
      ];
      for (const c of defaults) {
        insertCat.run(c.id, c.name, c.subfolder, JSON.stringify(c.extensions), c.colorToken);
      }
    }

    const schedCount = (this.db.prepare('SELECT COUNT(*) as c FROM schedules').get() as { c: number }).c;
    if (schedCount === 0) {
      this.db
        .prepare(
          `INSERT INTO schedules (id, name, queue_id, action, cron_time, days_json, speed_limit_kbps, enabled, last_run_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          'sched-night-start',
          'Start Off-Peak Batch at 01:00',
          'night',
          'start_queue',
          '01:00',
          JSON.stringify([0, 1, 2, 3, 4, 5, 6]),
          null,
          0,
          null
        );
    }

    const pluginCount = (this.db.prepare('SELECT COUNT(*) as c FROM plugins').get() as { c: number }).c;
    if (pluginCount === 0) {
      const insertP = this.db.prepare(
        `INSERT INTO plugins (id, name, version, category, author, description, permissions_json, enabled, built_in)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const builtIns: PluginDescriptor[] = [
        {
          id: 'core-http-range',
          name: 'Multi-Connection HTTP/S Range Engine',
          version: '1.0.0',
          category: 'download-provider',
          author: 'NovaLoad Core',
          description: 'Parallel segmented HTTP/HTTPS downloader with Range auto-detection and fallback.',
          permissions: ['network:http', 'fs:write-downloads'],
          enabled: true,
          builtIn: true,
        },
        {
          id: 'core-media-probe',
          name: 'Open Media & Stream Inspector',
          version: '1.0.0',
          category: 'media-extractor',
          author: 'NovaLoad Core',
          description: 'Inspects direct media containers and open HLS playlists without DRM bypass.',
          permissions: ['network:http', 'media:probe'],
          enabled: true,
          builtIn: true,
        },
        {
          id: 'core-sha-verifier',
          name: 'Cryptographic Integrity Verifier',
          version: '1.0.0',
          category: 'file-processor',
          author: 'NovaLoad Core',
          description: 'Streaming SHA-256 and SHA-512 hash verification and duplicate fingerprinting.',
          permissions: ['fs:read-downloads'],
          enabled: true,
          builtIn: true,
        },
        {
          id: 'core-gemini-assistant',
          name: 'Gemini AI File Organizer',
          version: '1.0.0',
          category: 'ai-provider',
          author: 'NovaLoad Core',
          description: 'Optional server-side Gemini assistant generating preview-and-confirm organization plans.',
          permissions: ['ai:metadata-read', 'ui:confirm-dialog'],
          enabled: true,
          builtIn: true,
        },
        {
          id: 'core-browser-bridge',
          name: 'WebExtension Local Bridge',
          version: '1.0.0',
          category: 'browser-bridge',
          author: 'NovaLoad Core',
          description: 'Token-authenticated handoff endpoint for Chrome, Edge, and Firefox extensions.',
          permissions: ['ipc:local-http', 'downloads:enqueue'],
          enabled: true,
          builtIn: true,
        },
      ];
      for (const p of builtIns) {
        insertP.run(p.id, p.name, p.version, p.category, p.author, p.description, JSON.stringify(p.permissions), p.enabled ? 1 : 0, p.builtIn ? 1 : 0);
      }
    }

    const existingSettings = this.db.prepare('SELECT value_json FROM settings WHERE key = ?').get('app_settings') as
      | { value_json: string }
      | undefined;

    if (!existingSettings) {
      const defaultSettings: AppSettings = {
        theme: 'dark',
        locale: 'en',
        defaultDownloadDir: this.downloadsDir,
        defaultConnections: 6,
        maxGlobalConcurrent: 4,
        globalSpeedLimitKbps: null,
        clipboardMonitoring: true,
        autoCategorize: true,
        verifyChecksumOnComplete: true,
        autoRetry: true,
        maxRetries: 3,
        notifyOnComplete: true,
        notifyOnError: true,
        minimizeToTray: true,
        launchOnStartup: false,
        browserBridgeEnabled: true,
        browserBridgeToken: generateBridgeToken(),
        aiEnabled: true,
        aiModel: 'gemini-4-hydrogen',
        aiRequireConfirmation: true,
        aiAllowFileMetadata: true,
        aiAllowFileContent: false,
        releaseChannel: 'stable',
        privacyBlockPrivateIps: true,
      };
      this.saveSettings(defaultSettings);
    }

    // Recover any downloads that were mid-flight when process terminated
    this.db
      .prepare(`UPDATE downloads SET status = 'paused', speed_bps = 0 WHERE status IN ('downloading', 'probing', 'verifying')`)
      .run();
    this.db
      .prepare(`UPDATE download_segments SET status = 'paused', speed_bps = 0 WHERE status = 'active'`)
      .run();
  }

  public getSettings(): AppSettings {
    const row = this.db.prepare('SELECT value_json FROM settings WHERE key = ?').get('app_settings') as {
      value_json: string;
    };
    return JSON.parse(row.value_json) as AppSettings;
  }

  public saveSettings(settings: AppSettings): AppSettings {
    this.db
      .prepare('INSERT INTO settings (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json')
      .run('app_settings', JSON.stringify(settings));
    return settings;
  }

  public getQueues(): QueueConfig[] {
    const rows = this.db.prepare('SELECT * FROM queues ORDER BY sort_order ASC').all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      description: String(r.description),
      maxConcurrent: Number(r.max_concurrent),
      maxConnectionsPerDownload: Number(r.max_connections_per_download),
      speedLimitKbps: r.speed_limit_kbps === null ? null : Number(r.speed_limit_kbps),
      isDefault: Boolean(r.is_default),
      sortOrder: Number(r.sort_order),
    }));
  }

  public upsertQueue(q: QueueConfig): void {
    this.db
      .prepare(
        `INSERT INTO queues (id, name, description, max_concurrent, max_connections_per_download, speed_limit_kbps, is_default, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           description = excluded.description,
           max_concurrent = excluded.max_concurrent,
           max_connections_per_download = excluded.max_connections_per_download,
           speed_limit_kbps = excluded.speed_limit_kbps,
           is_default = excluded.is_default,
           sort_order = excluded.sort_order`
      )
      .run(
        q.id,
        q.name,
        q.description,
        q.maxConcurrent,
        q.maxConnectionsPerDownload,
        q.speedLimitKbps,
        q.isDefault ? 1 : 0,
        q.sortOrder
      );
  }

  public getCategories(): CategoryRule[] {
    const rows = this.db.prepare('SELECT * FROM categories ORDER BY name ASC').all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      subfolder: String(r.subfolder),
      extensions: JSON.parse(String(r.extensions_json)) as string[],
      colorToken: String(r.color_token),
    }));
  }

  public upsertCategory(c: CategoryRule): void {
    this.db
      .prepare(
        `INSERT INTO categories (id, name, subfolder, extensions_json, color_token)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           subfolder = excluded.subfolder,
           extensions_json = excluded.extensions_json,
           color_token = excluded.color_token`
      )
      .run(c.id, c.name, c.subfolder, JSON.stringify(c.extensions), c.colorToken);
  }

  public getSchedules(): ScheduleRule[] {
    const rows = this.db.prepare('SELECT * FROM schedules ORDER BY cron_time ASC').all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      queueId: String(r.queue_id),
      action: String(r.action) as ScheduleRule['action'],
      cronTime: String(r.cron_time),
      daysOfWeek: JSON.parse(String(r.days_json)) as number[],
      speedLimitKbps: r.speed_limit_kbps === null ? null : Number(r.speed_limit_kbps),
      enabled: Boolean(r.enabled),
      lastRunAt: r.last_run_at ? String(r.last_run_at) : null,
    }));
  }

  public upsertSchedule(s: ScheduleRule): void {
    this.db
      .prepare(
        `INSERT INTO schedules (id, name, queue_id, action, cron_time, days_json, speed_limit_kbps, enabled, last_run_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           queue_id = excluded.queue_id,
           action = excluded.action,
           cron_time = excluded.cron_time,
           days_json = excluded.days_json,
           speed_limit_kbps = excluded.speed_limit_kbps,
           enabled = excluded.enabled,
           last_run_at = excluded.last_run_at`
      )
      .run(
        s.id,
        s.name,
        s.queueId,
        s.action,
        s.cronTime,
        JSON.stringify(s.daysOfWeek),
        s.speedLimitKbps,
        s.enabled ? 1 : 0,
        s.lastRunAt
      );
  }

  public deleteSchedule(id: string): void {
    this.db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
  }

  public getPlugins(): PluginDescriptor[] {
    const rows = this.db.prepare('SELECT * FROM plugins ORDER BY built_in DESC, name ASC').all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      version: String(r.version),
      category: String(r.category) as PluginDescriptor['category'],
      author: String(r.author),
      description: String(r.description),
      permissions: JSON.parse(String(r.permissions_json)) as string[],
      enabled: Boolean(r.enabled),
      builtIn: Boolean(r.built_in),
    }));
  }

  public togglePlugin(id: string, enabled: boolean): void {
    this.db.prepare('UPDATE plugins SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
  }

  private mapDownloadRow(r: Record<string, unknown>): DownloadItem {
    return {
      id: String(r.id),
      url: String(r.url),
      finalUrl: String(r.final_url),
      filename: String(r.filename),
      destinationDir: String(r.destination_dir),
      filePath: String(r.file_path),
      category: String(r.category),
      queueId: String(r.queue_id),
      priority: Number(r.priority),
      mimeType: String(r.mime_type),
      totalBytes: Number(r.total_bytes),
      downloadedBytes: Number(r.downloaded_bytes),
      progress: Number(r.progress),
      speedBps: Number(r.speed_bps),
      etaSeconds: r.eta_seconds === null ? null : Number(r.eta_seconds),
      status: String(r.status) as DownloadItem['status'],
      supportsRanges: Boolean(r.supports_ranges),
      connections: Number(r.connections),
      speedLimitKbps: r.speed_limit_kbps === null ? null : Number(r.speed_limit_kbps),
      etag: r.etag ? String(r.etag) : null,
      expectedChecksum: r.expected_checksum ? String(r.expected_checksum) : null,
      expectedChecksumAlgo: r.expected_checksum_algo
        ? (String(r.expected_checksum_algo) as DownloadItem['expectedChecksumAlgo'])
        : null,
      actualSha256: r.actual_sha256 ? String(r.actual_sha256) : null,
      actualSha512: r.actual_sha512 ? String(r.actual_sha512) : null,
      checksumVerified: r.checksum_verified === null ? null : Boolean(r.checksum_verified),
      errorMessage: r.error_message ? String(r.error_message) : null,
      retryCount: Number(r.retry_count),
      maxRetries: Number(r.max_retries),
      mediaFormat: r.media_format ? String(r.media_format) : null,
      mediaQuality: r.media_quality ? String(r.media_quality) : null,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      completedAt: r.completed_at ? String(r.completed_at) : null,
    };
  }

  public getAllDownloads(withDetails = false): DownloadItem[] {
    const rows = this.db
      .prepare('SELECT * FROM downloads ORDER BY priority DESC, created_at DESC')
      .all() as Record<string, unknown>[];
    const items = rows.map((r) => this.mapDownloadRow(r));
    if (!withDetails) return items;

    for (const item of items) {
      item.segments = this.getSegments(item.id);
      item.events = this.getEvents(item.id);
    }
    return items;
  }

  public getDownload(id: string, withDetails = true): DownloadItem | null {
    const row = this.db.prepare('SELECT * FROM downloads WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    const item = this.mapDownloadRow(row);
    if (withDetails) {
      item.segments = this.getSegments(id);
      item.events = this.getEvents(id);
    }
    return item;
  }

  public insertDownload(item: DownloadItem): void {
    this.db
      .prepare(
        `INSERT INTO downloads (
          id, url, final_url, filename, destination_dir, file_path, category, queue_id, priority,
          mime_type, total_bytes, downloaded_bytes, progress, speed_bps, eta_seconds, status,
          supports_ranges, connections, speed_limit_kbps, etag, expected_checksum, expected_checksum_algo,
          actual_sha256, actual_sha512, checksum_verified, error_message, retry_count, max_retries,
          media_format, media_quality, created_at, updated_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        item.id,
        item.url,
        item.finalUrl,
        item.filename,
        item.destinationDir,
        item.filePath,
        item.category,
        item.queueId,
        item.priority,
        item.mimeType,
        item.totalBytes,
        item.downloadedBytes,
        item.progress,
        item.speedBps,
        item.etaSeconds,
        item.status,
        item.supportsRanges ? 1 : 0,
        item.connections,
        item.speedLimitKbps,
        item.etag,
        item.expectedChecksum,
        item.expectedChecksumAlgo,
        item.actualSha256,
        item.actualSha512,
        item.checksumVerified === null ? null : item.checksumVerified ? 1 : 0,
        item.errorMessage,
        item.retryCount,
        item.maxRetries,
        item.mediaFormat,
        item.mediaQuality,
        item.createdAt,
        item.updatedAt,
        item.completedAt
      );
  }

  public updateDownload(id: string, patch: Partial<DownloadItem>): void {
    const existing = this.getDownload(id, false);
    if (!existing) return;
    const merged: DownloadItem = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.db
      .prepare(
        `UPDATE downloads SET
          final_url = ?, filename = ?, destination_dir = ?, file_path = ?, category = ?, queue_id = ?,
          priority = ?, mime_type = ?, total_bytes = ?, downloaded_bytes = ?, progress = ?,
          speed_bps = ?, eta_seconds = ?, status = ?, supports_ranges = ?, connections = ?,
          speed_limit_kbps = ?, etag = ?, expected_checksum = ?, expected_checksum_algo = ?,
          actual_sha256 = ?, actual_sha512 = ?, checksum_verified = ?, error_message = ?,
          retry_count = ?, max_retries = ?, updated_at = ?, completed_at = ?
        WHERE id = ?`
      )
      .run(
        merged.finalUrl,
        merged.filename,
        merged.destinationDir,
        merged.filePath,
        merged.category,
        merged.queueId,
        merged.priority,
        merged.mimeType,
        merged.totalBytes,
        merged.downloadedBytes,
        merged.progress,
        merged.speedBps,
        merged.etaSeconds,
        merged.status,
        merged.supportsRanges ? 1 : 0,
        merged.connections,
        merged.speedLimitKbps,
        merged.etag,
        merged.expectedChecksum,
        merged.expectedChecksumAlgo,
        merged.actualSha256,
        merged.actualSha512,
        merged.checksumVerified === null ? null : merged.checksumVerified ? 1 : 0,
        merged.errorMessage,
        merged.retryCount,
        merged.maxRetries,
        merged.updatedAt,
        merged.completedAt,
        id
      );
  }

  public deleteDownload(id: string): void {
    this.db.prepare('DELETE FROM downloads WHERE id = ?').run(id);
  }

  public replaceSegments(downloadId: string, segments: Omit<DownloadSegment, 'id'>[]): void {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM download_segments WHERE download_id = ?').run(downloadId);
      const stmt = this.db.prepare(
        `INSERT INTO download_segments (download_id, segment_index, start_byte, end_byte, downloaded_bytes, status, speed_bps)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      for (const seg of segments) {
        stmt.run(
          downloadId,
          seg.segmentIndex,
          seg.startByte,
          seg.endByte,
          seg.downloadedBytes,
          seg.status,
          seg.speedBps
        );
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  public updateSegmentProgress(
    downloadId: string,
    segmentIndex: number,
    downloadedBytes: number,
    status: DownloadSegment['status'],
    speedBps: number
  ): void {
    this.db
      .prepare(
        `UPDATE download_segments SET downloaded_bytes = ?, status = ?, speed_bps = ?
         WHERE download_id = ? AND segment_index = ?`
      )
      .run(downloadedBytes, status, speedBps, downloadId, segmentIndex);
  }

  public getSegments(downloadId: string): DownloadSegment[] {
    const rows = this.db
      .prepare('SELECT * FROM download_segments WHERE download_id = ? ORDER BY segment_index ASC')
      .all(downloadId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: Number(r.id),
      downloadId: String(r.download_id),
      segmentIndex: Number(r.segment_index),
      startByte: Number(r.start_byte),
      endByte: Number(r.end_byte),
      downloadedBytes: Number(r.downloaded_bytes),
      status: String(r.status) as DownloadSegment['status'],
      speedBps: Number(r.speed_bps),
    }));
  }

  public addEvent(downloadId: string, level: DownloadEvent['level'], message: string): void {
    this.db
      .prepare('INSERT INTO download_events (download_id, level, message, created_at) VALUES (?, ?, ?, ?)')
      .run(downloadId, level, message, new Date().toISOString());
  }

  public getEvents(downloadId: string, limit = 50): DownloadEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM download_events WHERE download_id = ? ORDER BY id DESC LIMIT ?')
      .all(downloadId, limit) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: Number(r.id),
      downloadId: String(r.download_id),
      level: String(r.level) as DownloadEvent['level'],
      message: String(r.message),
      createdAt: String(r.created_at),
    }));
  }

  public addAiHistory(entry: AiHistoryEntry): void {
    this.db
      .prepare(
        `INSERT INTO ai_history (id, prompt, model, summary, answer, proposed_actions_json, executed_count, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.id,
        entry.prompt,
        entry.model,
        entry.summary,
        entry.answer,
        entry.proposedActionsJson,
        entry.executedCount,
        entry.status,
        entry.createdAt
      );
  }

  public updateAiHistoryStatus(id: string, status: AiHistoryEntry['status'], executedCount: number): void {
    this.db
      .prepare('UPDATE ai_history SET status = ?, executed_count = ? WHERE id = ?')
      .run(status, executedCount, id);
  }

  public getAiHistory(limit = 30): AiHistoryEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM ai_history ORDER BY created_at DESC LIMIT ?')
      .all(limit) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      prompt: String(r.prompt),
      model: String(r.model),
      summary: String(r.summary),
      answer: String(r.answer),
      proposedActionsJson: String(r.proposed_actions_json),
      executedCount: Number(r.executed_count),
      status: String(r.status) as AiHistoryEntry['status'],
      createdAt: String(r.created_at),
    }));
  }

  public clearAiHistory(): void {
    this.db.prepare('DELETE FROM ai_history').run();
  }

  public logBrowserCapture(browser: string, url: string, filename: string | null, referrer: string | null, downloadId: string | null): void {
    this.db
      .prepare(
        `INSERT INTO browser_captures (id, browser, url, filename, referrer, download_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(`cap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, browser, url, filename, referrer, downloadId, new Date().toISOString());
  }

  public checkIntegrity(): { ok: boolean; details: string } {
    const res = this.db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
    return {
      ok: res.integrity_check === 'ok',
      details: res.integrity_check,
    };
  }

  public exportSnapshot(): Record<string, unknown> {
    return {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      queues: this.getQueues(),
      categories: this.getCategories(),
      schedules: this.getSchedules(),
      downloads: this.getAllDownloads(true),
      plugins: this.getPlugins(),
      settings: {
        ...this.getSettings(),
        browserBridgeToken: '[REDACTED_ON_EXPORT]',
      },
    };
  }

  public close(): void {
    this.db.close();
  }
}
