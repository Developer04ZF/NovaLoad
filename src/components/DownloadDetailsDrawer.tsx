/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ShieldCheck, ShieldAlert, Pause, Play, RotateCcw, Gauge, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { DownloadItem } from '../shared/types';
import { api } from '../lib/api';
import { formatBytes, formatEta, formatSpeed } from '../lib/format';

interface DrawerProps {
  download: DownloadItem | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const DownloadDetailsDrawer: React.FC<DrawerProps> = ({ download, onClose, onRefresh }) => {
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyAlgo, setVerifyAlgo] = useState<'sha256' | 'sha512'>('sha256');
  const [speedCap, setSpeedCap] = useState('');
  const [busy, setBusy] = useState(false);

  if (!download) return null;

  const handleVerify = async () => {
    setBusy(true);
    try {
      await api.verifyDownload(download.id, verifyInput.trim() || undefined, verifyAlgo);
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateSpeedCap = async () => {
    setBusy(true);
    try {
      await api.updateDownload(download.id, {
        speedLimitKbps: speedCap ? Number(speedCap) : null,
      });
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-label="Download details inspector">
      <div className="w-full max-w-2xl h-full bg-white dark:bg-[#121722] border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{download.filename}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{download.finalUrl}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">Progress</div>
              <div className="text-sm font-semibold font-mono tabular-nums mt-0.5">{download.progress.toFixed(1)}%</div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">Transferred</div>
              <div className="text-sm font-semibold font-mono tabular-nums mt-0.5">
                {formatBytes(download.downloadedBytes)} / {download.totalBytes > 0 ? formatBytes(download.totalBytes) : '—'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">Live Speed</div>
              <div className="text-sm font-semibold font-mono tabular-nums mt-0.5">{formatSpeed(download.speedBps)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">ETA</div>
              <div className="text-sm font-semibold font-mono tabular-nums mt-0.5">{formatEta(download.etaSeconds)}</div>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {download.status === 'downloading' ? (
              <button
                type="button"
                onClick={() => void api.pauseDownload(download.id).then(onRefresh)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
            ) : download.status !== 'completed' ? (
              <button
                type="button"
                onClick={() => void api.startDownload(download.id).then(onRefresh)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Resume
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => void api.retryDownload(download.id).then(onRefresh)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restart Fresh
            </button>

            <div className="flex items-center gap-1.5 ml-auto">
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="number"
                min={16}
                placeholder={download.speedLimitKbps ? `${download.speedLimitKbps} KB/s` : 'Cap KB/s'}
                value={speedCap}
                onChange={(e) => setSpeedCap(e.target.value)}
                className="w-24 px-2 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleUpdateSpeedCap()}
                className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Apply Cap
              </button>
            </div>
          </div>

          {/* Connection Segment Inspector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Connection Segments ({download.segments?.length || download.connections})
              </h4>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {download.supportsRanges ? 'HTTP 206 Range Parallel' : 'Single-Stream Fallback'}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
              {(download.segments || []).map((seg) => {
                const segTotal = seg.endByte >= seg.startByte ? seg.endByte - seg.startByte + 1 : 0;
                const pct = segTotal > 0 ? Math.min(100, Math.round((seg.downloadedBytes / segTotal) * 100)) : download.progress;
                return (
                  <div key={seg.segmentIndex} className="px-3.5 py-2.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-mono tabular-nums">
                      <span className="text-slate-700 dark:text-slate-300">
                        Conn #{seg.segmentIndex + 1} · bytes {seg.startByte}–{seg.endByte >= 0 ? seg.endByte : 'EOF'}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {seg.status} · {formatSpeed(seg.speedBps)} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-150 ${
                          seg.status === 'completed'
                            ? 'bg-emerald-500'
                            : seg.status === 'error'
                              ? 'bg-red-500'
                              : seg.status === 'paused'
                                ? 'bg-amber-500'
                                : 'bg-blue-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cryptographic Integrity Verification */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Integrity & Checksum Verification
              </h4>
              {download.checksumVerified === true && (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Match
                </span>
              )}
              {download.checksumVerified === false && (
                <span className="text-xs font-medium text-red-600 dark:text-red-400 inline-flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Checksum Mismatch
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="text-slate-500 dark:text-slate-400">
                File path: <span className="text-slate-800 dark:text-slate-200 break-all">{download.filePath}</span>
              </div>
              {download.actualSha256 && (
                <div className="text-slate-500 dark:text-slate-400">
                  SHA-256: <span className="text-slate-800 dark:text-slate-200 break-all">{download.actualSha256}</span>
                </div>
              )}
              {download.actualSha512 && (
                <div className="text-slate-500 dark:text-slate-400">
                  SHA-512: <span className="text-slate-800 dark:text-slate-200 break-all">{download.actualSha512.slice(0, 64)}…</span>
                </div>
              )}
            </div>

            {download.status === 'completed' && (
              <div className="flex flex-wrap gap-2 pt-1">
                <input
                  type="text"
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  placeholder="Optional expected SHA-256 or SHA-512 hash"
                  className="flex-1 min-w-[200px] px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
                />
                <select
                  value={verifyAlgo}
                  onChange={(e) => setVerifyAlgo(e.target.value as 'sha256' | 'sha512')}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
                >
                  <option value="sha256">SHA-256</option>
                  <option value="sha512">SHA-512</option>
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleVerify()}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90"
                >
                  Verify File
                </button>
              </div>
            )}
          </div>

          {download.errorMessage && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{download.errorMessage}</span>
            </div>
          )}

          {/* Event Log */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Transfer Event Log</h4>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 max-h-56 overflow-y-auto">
              {(download.events || []).length === 0 ? (
                <div className="px-3.5 py-4 text-xs text-slate-500 text-center">No events recorded yet.</div>
              ) : (
                download.events!.map((ev) => (
                  <div key={ev.id} className="px-3.5 py-2 text-xs flex items-start justify-between gap-3">
                    <span
                      className={
                        ev.level === 'error'
                          ? 'text-red-600 dark:text-red-400'
                          : ev.level === 'warn'
                            ? 'text-amber-600 dark:text-amber-400'
                            : ev.level === 'success'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-700 dark:text-slate-300'
                      }
                    >
                      {ev.message}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">
                      {new Date(ev.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
