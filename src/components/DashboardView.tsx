/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, Layers, PauseCircle, PlayCircle, ArrowUpRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { DashboardSnapshot, DownloadItem } from '../shared/types';
import { api } from '../lib/api';
import { formatBytes, formatEta, formatRelativeTime, formatSpeed } from '../lib/format';
import { BandwidthChart } from './BandwidthChart';
import { NoviMascot } from './svg/NoviMascot';
import type { TranslationStrings } from '../lib/i18n';

interface DashboardViewProps {
  snapshot: DashboardSnapshot;
  t: TranslationStrings;
  onOpenAdd: (tab?: 'single' | 'batch') => void;
  onInspect: (item: DownloadItem) => void;
  onNavigate: (tab: string) => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  snapshot,
  t,
  onOpenAdd,
  onInspect,
  onNavigate,
  onRefresh,
}) => {
  const { stats, downloads, bandwidthHistory, queues } = snapshot;
  const activeDownloads = downloads.filter((d) => d.status === 'downloading' || d.status === 'verifying');
  const recentDownloads = downloads.slice(0, 6);

  const launchInstantDemo = async () => {
    const sampleUrl = `${window.location.origin}/api/fixtures/file/dataset-telemetry-2026.zip`;
    await api.createDownload({ url: sampleUrl, connections: 6, startImmediately: true });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.nav.dashboard}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.tagline}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAdd('single')}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> {t.actions.addDownload}
          </button>
          <button
            type="button"
            onClick={() => onOpenAdd('batch')}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121722] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5" /> {t.actions.batchImport}
          </button>
          <button
            type="button"
            onClick={() => void api.pauseAll().then(onRefresh)}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121722] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <PauseCircle className="w-3.5 h-3.5" /> {t.actions.pauseAll}
          </button>
          <button
            type="button"
            onClick={() => void api.resumeAll().then(onRefresh)}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121722] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <PlayCircle className="w-3.5 h-3.5" /> {t.actions.resumeAll}
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.metrics.currentSpeed}</div>
          <div className="text-lg font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-1">
            {formatSpeed(stats.currentSpeedBps)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.metrics.peakSpeed}</div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {formatSpeed(stats.peakSpeedBps)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.metrics.totalData}</div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {formatBytes(stats.totalDownloadedBytes)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.metrics.activeTransfers}</div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {stats.activeCount}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.metrics.queueStatus}</div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {stats.queuedCount}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.metrics.completedFiles}</div>
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.completedCount}
          </div>
        </div>
      </div>

      {/* Bandwidth Visualization + Queue Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bandwidth Telemetry</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {snapshot.settings.globalSpeedLimitKbps
                ? `Global Cap: ${snapshot.settings.globalSpeedLimitKbps} KB/s`
                : 'Uncapped Throughput'}
            </span>
          </div>
          <BandwidthChart points={bandwidthHistory} peakSpeedBps={stats.peakSpeedBps} />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Queue Engine</h2>
              <button
                type="button"
                onClick={() => onNavigate('queues')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                Manage <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {queues.map((q) => (
                <div key={q.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">{q.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      Max {q.maxConcurrent} concurrent · {q.maxConnectionsPerDownload} conn
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {q.activeCount || 0} active / {q.queuedCount || 0} queued
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <NoviMascot
              expression={
                stats.activeCount > 0
                  ? 'downloading'
                  : stats.failedCount > 0
                    ? 'warning'
                    : stats.completedCount > 0
                      ? 'happy'
                      : 'idle'
              }
              size={54}
            />
            <div className="text-xs">
              <div className="font-medium text-slate-800 dark:text-slate-200">
                {stats.activeCount > 0
                  ? `Accelerating ${stats.activeCount} active transfer${stats.activeCount > 1 ? 's' : ''}`
                  : 'Engine ready for segmented downloads'}
              </div>
              <button
                type="button"
                onClick={() => void launchInstantDemo()}
                className="text-blue-600 dark:text-blue-400 hover:underline mt-0.5 font-medium"
              >
                Run 6-connection test transfer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Transfers + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Active Transfers</h2>
            <button
              type="button"
              onClick={() => onNavigate('downloading')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all
            </button>
          </div>
          {activeDownloads.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No active transfers right now. Click <span className="font-medium text-slate-700 dark:text-slate-200">Add Download</span> or run a verification transfer.
            </div>
          ) : (
            <div className="space-y-3">
              {activeDownloads.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D1119] space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => onInspect(item)}
                      className="font-medium text-slate-900 dark:text-slate-100 truncate hover:text-blue-600 text-left"
                    >
                      {item.filename}
                    </button>
                    <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400 shrink-0">
                      {formatSpeed(item.speedBps)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-150" style={{ width: `${item.progress}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    <span>
                      {formatBytes(item.downloadedBytes)} / {item.totalBytes > 0 ? formatBytes(item.totalBytes) : '—'} ({item.connections}×)
                    </span>
                    <span>ETA {formatEta(item.etaSeconds)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h2>
            <button
              type="button"
              onClick={() => onNavigate('all')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              All downloads
            </button>
          </div>
          {recentDownloads.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Your download history and integrity verification records will appear here.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentDownloads.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : item.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onInspect(item)}
                        className="font-medium text-slate-800 dark:text-slate-200 truncate block max-w-full hover:text-blue-600 text-left"
                      >
                        {item.filename}
                      </button>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.category} · {formatBytes(item.totalBytes || item.downloadedBytes)} · {formatRelativeTime(item.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                    {item.progress.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
