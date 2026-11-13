/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
import type { MediaFormatOption, MediaProbeResult } from '../../src/shared/types.ts';
import { DownloadManager } from '../engine/downloadManager.ts';

export class MediaService {
  private readonly downloadManager: DownloadManager;

  constructor(downloadManager: DownloadManager) {
    this.downloadManager = downloadManager;
  }

  public async probeMediaUrl(rawUrl: string): Promise<MediaProbeResult> {
    const probe = await this.downloadManager.probeUrl(rawUrl);
    const ext = path.extname(probe.filename).replace(/^\./, '').toLowerCase();
    const baseName = path.basename(probe.filename, path.extname(probe.filename));

    const isM3u8 = ext === 'm3u8' || probe.mimeType.includes('mpegurl');
    const isVideo = ['mp4', 'webm', 'mkv', 'mov', 'm4v'].includes(ext) || probe.mimeType.startsWith('video/');
    const isAudio = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext) || probe.mimeType.startsWith('audio/');

    const formats: MediaFormatOption[] = [];

    if (isM3u8) {
      const res = await fetch(probe.finalUrl, { signal: AbortSignal.timeout(10000) });
      const text = await res.text();
      const lines = text.split(/\r?\n/);
      let idx = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
          const bwMatch = /BANDWIDTH=(\d+)/i.exec(line);
          const resMatch = /RESOLUTION=(\d+x\d+)/i.exec(line);
          const uri = lines[i + 1]?.trim();
          if (uri && !uri.startsWith('#')) {
            idx++;
            const resolvedUri = new URL(uri, probe.finalUrl).toString();
            const resolution = resMatch?.[1] || 'Adaptive';
            const bitrateKbps = bwMatch?.[1] ? Math.round(Number(bwMatch[1]) / 1000) : null;
            formats.push({
              id: `hls-${idx}`,
              label: `${resolution} HLS Stream`,
              container: 'ts',
              resolution,
              codec: 'H.264 / AAC',
              bitrateKbps,
              estimatedBytes: null,
              audioOnly: false,
              downloadUrl: resolvedUri,
            });
          }
        }
      }
    }

    if (formats.length === 0 && (isVideo || isAudio || probe.totalBytes > 0)) {
      formats.push({
        id: 'source-original',
        label: isAudio ? `Original Audio (${ext.toUpperCase() || 'AUDIO'})` : `Original Source (${ext.toUpperCase() || 'MEDIA'})`,
        container: ext || (isAudio ? 'mp3' : 'mp4'),
        resolution: isAudio ? 'Audio Track' : isVideo ? 'Source Native' : 'Direct Stream',
        codec: isAudio ? 'Source Audio' : 'Source Video + Audio',
        bitrateKbps: null,
        estimatedBytes: probe.totalBytes > 0 ? probe.totalBytes : null,
        audioOnly: isAudio,
        downloadUrl: probe.finalUrl,
      });

      // If hitting local fixture video endpoint, expose explicit quality variants served by fixture server
      const parsed = new URL(probe.finalUrl);
      if (parsed.pathname.startsWith('/api/fixtures/video/')) {
        const variants = [
          { id: '1080p', label: '1080p Full HD', res: '1920x1080', container: 'mp4', audioOnly: false, q: '1080p', scale: 1 },
          { id: '720p', label: '720p HD', res: '1280x720', container: 'mp4', audioOnly: false, q: '720p', scale: 0.55 },
          { id: 'audio-mp3', label: 'Audio Only (MP3 320kbps)', res: 'Audio', container: 'mp3', audioOnly: true, q: 'audio', scale: 0.18 },
        ];
        formats.length = 0;
        for (const v of variants) {
          const u = new URL(probe.finalUrl);
          u.searchParams.set('quality', v.q);
          formats.push({
            id: v.id,
            label: v.label,
            container: v.container,
            resolution: v.res,
            codec: v.audioOnly ? 'MP3 320kbps' : 'H.264 + AAC',
            bitrateKbps: v.audioOnly ? 320 : v.q === '1080p' ? 4800 : 2400,
            estimatedBytes: probe.totalBytes > 0 ? Math.round(probe.totalBytes * v.scale) : null,
            audioOnly: v.audioOnly,
            downloadUrl: u.toString(),
          });
        }
      }
    }

    return {
      sourceUrl: probe.finalUrl,
      title: baseName || probe.filename,
      durationSeconds: null,
      extractor: isM3u8 ? 'Open HLS Playlist Parser' : 'Direct HTTP Media Stream',
      supportsAudioExtraction: formats.some((f) => f.audioOnly),
      drmProtected: false,
      formats,
      warning:
        formats.length === 0
          ? 'No direct downloadable media stream detected. NovaLoad does not bypass DRM or gated HTML pages.'
          : null,
    };
  }
}
