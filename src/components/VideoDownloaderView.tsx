/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Film, Music, Download, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { DownloadItem, MediaFormatOption, MediaProbeResult } from '../shared/types';
import { api } from '../lib/api';
import { formatBytes, formatRelativeTime } from '../lib/format';
import { NovaIllustration } from './svg/NovaIllustrations';

interface VideoDownloaderProps {
  downloads: DownloadItem[];
  onRefresh: () => void;
  onInspect: (item: DownloadItem) => void;
}

export const VideoDownloaderView: React.FC<VideoDownloaderProps> = ({ downloads, onRefresh, onInspect }) => {
  const [url, setUrl] = useState('');
  const [probing, setProbing] = useState(false);
  const [result, setResult] = useState<MediaProbeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  const mediaHistory = downloads.filter(
    (d) => d.category === 'video' || d.category === 'audio' || d.mediaFormat !== null
  );

  const handleProbe = async (targetUrl?: string) => {
    const u = (targetUrl ?? url).trim();
    if (!u) return;
    setProbing(true);
    setError(null);
    try {
      const res = await api.probeMedia(u);
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
      setResult(null);
    } finally {
      setProbing(false);
    }
  };

  const handleDownloadFormat = async (fmt: MediaFormatOption) => {
    if (!result) return;
    setStartingId(fmt.id);
    try {
      await api.createDownload({
        url: fmt.downloadUrl,
        category: fmt.audioOnly ? 'audio' : 'video',
        queueId: 'media',
        mediaFormat: fmt.container,
        mediaQuality: fmt.resolution,
        startImmediately: true,
      });
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Video & Media Downloader</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Inspect open media streams, select video resolutions or audio-only tracks, and accelerate transfers. Does not bypass DRM or gated content.
        </p>
      </div>

      {/* Probe Box */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleProbe();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.org/open-stream/release-demo.mp4"
            className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={probing || !url.trim()}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            {probing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Inspect Media Formats
          </button>
        </form>

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span>Sample stream:</span>
          <button
            type="button"
            onClick={() => {
              const sample = `${window.location.origin}/api/fixtures/video/novaload-release-walkthrough.mp4`;
              setUrl(sample);
              void handleProbe(sample);
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Load NovaLoad Sample Stream (1080p / 720p / MP3)
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Probe Result */}
      {result ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{result.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Extractor: {result.extractor} · {result.formats.length} format options
              </p>
            </div>
            {result.supportsAudioExtraction && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Audio track available
              </span>
            )}
          </div>

          {result.warning && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{result.warning}</span>
            </div>
          )}

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {result.formats.map((fmt) => (
              <div key={fmt.id} className="py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                    {fmt.audioOnly ? <Music className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{fmt.label}</div>
                    <div className="text-slate-500 dark:text-slate-400 font-mono">
                      {fmt.container.toUpperCase()} · {fmt.resolution} · {fmt.codec}
                      {fmt.bitrateKbps ? ` · ${fmt.bitrateKbps} kbps` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {fmt.estimatedBytes ? formatBytes(fmt.estimatedBytes) : 'Stream'}
                  </span>
                  <button
                    type="button"
                    disabled={startingId === fmt.id}
                    onClick={() => void handleDownloadFormat(fmt)}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {startingId === fmt.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] py-10 px-6 flex flex-col items-center text-center">
          <NovaIllustration scene="video-downloader" width={180} height={120} />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-3">
            Ready to inspect open media URLs
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1">
            Paste a direct video, audio, or open HLS playlist URL above to view resolutions, codecs, and audio extraction tracks.
          </p>
        </div>
      )}

      {/* Media History */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Media Download History</h2>
        {mediaHistory.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">No media downloads recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            {mediaHistory.map((m) => (
              <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onInspect(m)}
                    className="font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 truncate block"
                  >
                    {m.filename}
                  </button>
                  <div className="text-slate-500 dark:text-slate-400 font-mono">
                    {m.mediaQuality || m.category} · {formatBytes(m.totalBytes || m.downloadedBytes)} · {formatRelativeTime(m.createdAt)}
                  </div>
                </div>
                <span className="font-mono text-slate-600 dark:text-slate-300">{m.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
