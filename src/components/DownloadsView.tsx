/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Search,
  LayoutList,
  LayoutGrid,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  FileArchive,
  FileText,
  Film,
  Music,
  Image as ImageIcon,
  Package,
  File,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Plus,
} from 'lucide-react';
import type { CategoryRule, DownloadItem, DownloadStatus, QueueConfig } from '../shared/types';
import { api } from '../lib/api';
import { formatBytes, formatEta, formatRelativeTime, formatSpeed } from '../lib/format';
import { NovaIllustration } from './svg/NovaIllustrations';

export type DownloadFilterMode =
  | 'all'
  | 'downloading'
  | 'queued'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'history';

interface DownloadsViewProps {
  mode: DownloadFilterMode;
  downloads: DownloadItem[];
  categories: CategoryRule[];
  queues: QueueConfig[];
  onInspect: (item: DownloadItem) => void;
  onOpenAdd: () => void;
  onRefresh: () => void;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'archives':
      return FileArchive;
    case 'documents':
      return FileText;
    case 'video':
      return Film;
    case 'audio':
      return Music;
    case 'images':
      return ImageIcon;
    case 'software':
      return Package;
    default:
      return File;
  }
}

function StatusLabel({ status }: { status: DownloadStatus }) {
  switch (status) {
    case 'downloading':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Downloading
        </span>
      );
    case 'verifying':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
        </span>
      );
    case 'paused':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          <Pause className="w-3.5 h-3.5" /> Paused
        </span>
      );
    case 'queued':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5" /> Queued
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5" /> Failed
        </span>
      );
    case 'cancelled':
      return <span className="text-xs font-medium text-slate-500">Cancelled</span>;
    default:
      return <span className="text-xs font-medium text-slate-500">{status}</span>;
  }
}

export const DownloadsView: React.FC<DownloadsViewProps> = ({
  mode,
  downloads,
  categories,
  queues,
  onInspect,
  onOpenAdd,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [queueFilter, setQueueFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'size' | 'progress'>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = downloads;
    if (mode === 'downloading') {
      list = list.filter((d) => d.status === 'downloading' || d.status === 'verifying' || d.status === 'probing');
    } else if (mode === 'queued') {
      list = list.filter((d) => d.status === 'queued');
    } else if (mode === 'paused') {
      list = list.filter((d) => d.status === 'paused');
    } else if (mode === 'completed') {
      list = list.filter((d) => d.status === 'completed');
    } else if (mode === 'failed') {
      list = list.filter((d) => d.status === 'failed' || d.status === 'cancelled');
    } else if (mode === 'history') {
      list = list.filter((d) => d.status === 'completed' || d.status === 'failed' || d.status === 'cancelled');
    }

    if (categoryFilter !== 'all') {
      list = list.filter((d) => d.category === categoryFilter);
    }
    if (queueFilter !== 'all') {
      list = list.filter((d) => d.queueId === queueFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.filename.toLowerCase().includes(q) ||
          d.url.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sortBy === 'name') sorted.sort((a, b) => a.filename.localeCompare(b.filename));
    else if (sortBy === 'size') sorted.sort((a, b) => b.totalBytes - a.totalBytes);
    else if (sortBy === 'progress') sorted.sort((a, b) => b.progress - a.progress);
    else if (mode === 'queued') sorted.sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt));
    else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return sorted;
  }, [downloads, mode, categoryFilter, queueFilter, search, sortBy]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((d) => d.id)));
    }
  };

  const runBulkAction = async (action: 'pause' | 'resume' | 'delete') => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      if (action === 'pause') await api.pauseDownload(id);
      else if (action === 'resume') await api.startDownload(id);
      else await api.deleteDownload(id, false);
    }
    setSelectedIds(new Set());
    onRefresh();
  };

  const handleReorder = async (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = filtered.map((d) => d.id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, fromId);
    await api.reorderQueues(ids);
    onRefresh();
  };

  const moveStep = async (id: string, dir: -1 | 1) => {
    const ids = filtered.map((d) => d.id);
    const idx = ids.indexOf(id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= ids.length) return;
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    await api.reorderQueues(ids);
    onRefresh();
  };

  const titles: Record<DownloadFilterMode, string> = {
    all: 'All Downloads',
    downloading: 'Active Downloads',
    queued: 'Queued Downloads',
    paused: 'Paused Downloads',
    completed: 'Completed Downloads',
    failed: 'Failed & Cancelled',
    history: 'Download History',
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{titles[mode]}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            {filtered.length} {filtered.length === 1 ? 'transfer' : 'transfers'} shown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename or URL..."
              aria-label="Search downloads"
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121722] text-slate-900 dark:text-slate-100 w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121722] text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={queueFilter}
            onChange={(e) => setQueueFilter(e.target.value)}
            aria-label="Filter by queue"
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121722] text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Queues</option>
            {queues.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Sort downloads"
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121722] text-slate-700 dark:text-slate-200"
          >
            <option value="newest">Sort: Newest</option>
            <option value="name">Sort: Name</option>
            <option value="size">Sort: Size</option>
            <option value="progress">Sort: Progress</option>
          </select>

          <div className="flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/70">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
              className={`p-1.5 rounded-md ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              aria-label="Card view"
              className={`p-1.5 rounded-md ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 text-xs">
          <span className="font-medium text-blue-900 dark:text-blue-200 tabular-nums">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void runBulkAction('resume')}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Resume Selected
            </button>
            <button
              type="button"
              onClick={() => void runBulkAction('pause')}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Pause Selected
            </button>
            <button
              type="button"
              onClick={() => void runBulkAction('delete')}
              className="px-2.5 py-1 rounded border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Remove Selected
            </button>
          </div>
        </div>
      )}

      {/* Empty States */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] py-14 px-6 flex flex-col items-center text-center">
          <NovaIllustration scene={search ? 'empty-search' : 'no-downloads'} width={180} height={120} />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-4">
            {search ? 'No matching downloads' : 'No transfers in this view'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            {search
              ? 'Try clearing your search query or switching category and queue filters.'
              : 'Add a file URL or paste a batch list to start multi-connection downloading.'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={onOpenAdd}
              className="mt-4 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Download
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pl-4 pr-2 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    aria-label="Select all downloads"
                    className="rounded border-slate-300 dark:border-slate-600"
                  />
                </th>
                <th className="py-2.5 px-3">File & Destination</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 w-44">Progress</th>
                <th className="py-2.5 px-3 text-right">Size</th>
                <th className="py-2.5 px-3 text-right">Speed</th>
                <th className="py-2.5 px-3 text-right">ETA</th>
                <th className="py-2.5 px-3 text-right">Conn</th>
                <th className="py-2.5 pl-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-xs">
              {filtered.map((item, idx) => {
                const Icon = getCategoryIcon(item.category);
                return (
                  <tr
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggedId(item.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedId) void handleReorder(draggedId, item.id);
                      setDraggedId(null);
                    }}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-2.5 pl-4 pr-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        aria-label={`Select ${item.filename}`}
                        className="rounded border-slate-300 dark:border-slate-600"
                      />
                    </td>
                    <td className="py-2.5 px-3 max-w-[280px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onInspect(item)}
                            className="font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block max-w-full text-left"
                          >
                            {item.filename}
                          </button>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {item.category} · {item.queueId} · {formatRelativeTime(item.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <StatusLabel status={item.status} />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-150 ${
                              item.status === 'completed'
                                ? 'bg-emerald-500'
                                : item.status === 'failed'
                                  ? 'bg-red-500'
                                  : item.status === 'paused'
                                    ? 'bg-amber-500'
                                    : 'bg-blue-600'
                            }`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300 w-10 text-right">
                          {item.progress.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {item.totalBytes > 0 ? formatBytes(item.totalBytes) : formatBytes(item.downloadedBytes)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {item.status === 'downloading' ? formatSpeed(item.speedBps) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {item.status === 'downloading' ? formatEta(item.etaSeconds) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {item.connections}×
                    </td>
                    <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {mode === 'queued' && (
                          <>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => void moveStep(item.id, -1)}
                              aria-label="Move up in queue"
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === filtered.length - 1}
                              onClick={() => void moveStep(item.id, 1)}
                              aria-label="Move down in queue"
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {item.status === 'downloading' ? (
                          <button
                            type="button"
                            onClick={() => void api.pauseDownload(item.id).then(onRefresh)}
                            aria-label={`Pause ${item.filename}`}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        ) : item.status !== 'completed' ? (
                          <button
                            type="button"
                            onClick={() => void api.startDownload(item.id).then(onRefresh)}
                            aria-label={`Start ${item.filename}`}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                        {item.status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => void api.retryDownload(item.id).then(onRefresh)}
                            aria-label={`Retry ${item.filename}`}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onInspect(item)}
                          aria-label={`Inspect ${item.filename}`}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void api.deleteDownload(item.id, false).then(onRefresh)}
                          aria-label={`Delete ${item.filename}`}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const Icon = getCategoryIcon(item.category);
            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-300">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onInspect(item)}
                        className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate block max-w-full hover:text-blue-600 text-left"
                      >
                        {item.filename}
                      </button>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.category} · {item.connections} connections
                      </div>
                    </div>
                  </div>
                  <StatusLabel status={item.status} />
                </div>

                <div className="space-y-1.5">
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${
                        item.status === 'completed'
                          ? 'bg-emerald-500'
                          : item.status === 'failed'
                            ? 'bg-red-500'
                            : item.status === 'paused'
                              ? 'bg-amber-500'
                              : 'bg-blue-600'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    <span>
                      {formatBytes(item.downloadedBytes)} / {item.totalBytes > 0 ? formatBytes(item.totalBytes) : '—'}
                    </span>
                    <span>
                      {item.status === 'downloading' ? `${formatSpeed(item.speedBps)} · ${formatEta(item.etaSeconds)}` : `${item.progress.toFixed(0)}%`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/70 text-xs">
                  <button
                    type="button"
                    onClick={() => onInspect(item)}
                    className="text-slate-600 dark:text-slate-300 hover:text-blue-600 font-medium"
                  >
                    Inspect Segments
                  </button>
                  <div className="flex items-center gap-1.5">
                    {item.status === 'downloading' ? (
                      <button
                        type="button"
                        onClick={() => void api.pauseDownload(item.id).then(onRefresh)}
                        className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Pause
                      </button>
                    ) : item.status !== 'completed' ? (
                      <button
                        type="button"
                        onClick={() => void api.startDownload(item.id).then(onRefresh)}
                        className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Resume
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
