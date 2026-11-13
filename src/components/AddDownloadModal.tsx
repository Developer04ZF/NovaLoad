/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { X, Link2, Layers, ShieldCheck, ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react';
import type { CategoryRule, QueueConfig } from '../shared/types';
import { api } from '../lib/api';
import { formatBytes } from '../lib/format';

interface AddDownloadModalProps {
  open: boolean;
  onClose: () => void;
  queues: QueueConfig[];
  categories: CategoryRule[];
  defaultConnections: number;
  initialTab?: 'single' | 'batch';
  onCreated: () => void;
}

export const AddDownloadModal: React.FC<AddDownloadModalProps> = ({
  open,
  onClose,
  queues,
  categories,
  defaultConnections,
  initialTab = 'single',
  onCreated,
}) => {
  const [tab, setTab] = useState<'single' | 'batch'>(initialTab);
  const [url, setUrl] = useState('');
  const [filename, setFilename] = useState('');
  const [category, setCategory] = useState('');
  const [queueId, setQueueId] = useState('default');
  const [connections, setConnections] = useState(defaultConnections);
  const [speedLimitKbps, setSpeedLimitKbps] = useState('');
  const [expectedChecksum, setExpectedChecksum] = useState('');
  const [checksumAlgo, setChecksumAlgo] = useState<'sha256' | 'sha512'>('sha256');
  const [startImmediately, setStartImmediately] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [probing, setProbing] = useState(false);
  const [probeInfo, setProbeInfo] = useState<{
    filename: string;
    totalBytes: number;
    supportsRanges: boolean;
    mimeType: string;
    suggestedCategory: string;
  } | null>(null);

  const [batchUrls, setBatchUrls] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    // Optional clipboard check if permitted by browser
    if (navigator.clipboard?.readText && !url) {
      navigator.clipboard
        .readText()
        .then((clip) => {
          const trimmed = clip.trim();
          if (/^https?:\/\/\S+$/i.test(trimmed)) {
            setUrl(trimmed);
          }
        })
        .catch(() => {
          // Clipboard permission declined — silent fallback
        });
    }
  }, [open]);

  if (!open) return null;

  const handleProbe = async (targetUrl?: string) => {
    const u = (targetUrl ?? url).trim();
    if (!u) return;
    setProbing(true);
    setError(null);
    try {
      const res = await api.probeUrl(u);
      setProbeInfo(res);
      if (!filename) setFilename(res.filename);
      if (!category) setCategory(res.suggestedCategory);
    } catch (err) {
      setError((err as Error).message);
      setProbeInfo(null);
    } finally {
      setProbing(false);
    }
  };

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createDownload({
        url: url.trim(),
        filename: filename.trim() || undefined,
        category: category || undefined,
        queueId,
        connections,
        speedLimitKbps: speedLimitKbps ? Number(speedLimitKbps) : null,
        expectedChecksum: expectedChecksum.trim() || null,
        expectedChecksumAlgo: expectedChecksum.trim() ? checksumAlgo : null,
        startImmediately,
      });
      setUrl('');
      setFilename('');
      setProbeInfo(null);
      setExpectedChecksum('');
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = batchUrls
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError('Enter at least one HTTP or HTTPS URL.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.batchCreateDownloads(lines, queueId, startImmediately);
      const failures = res.created.filter((r) => !r.ok);
      if (failures.length > 0 && failures.length === res.created.length) {
        setError(failures[0].error || 'Failed to queue batch URLs.');
      } else {
        setBatchUrls('');
        onCreated();
        onClose();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const loadLocalSample = (fixturePath: string) => {
    const full = `${window.location.origin}${fixturePath}`;
    setUrl(full);
    setFilename('');
    setCategory('');
    void handleProbe(full);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-download-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <h2 id="add-download-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
              New Download
            </h2>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setTab('single')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tab === 'single'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Single URL
              </button>
              <button
                type="button"
                onClick={() => setTab('batch')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tab === 'batch'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Batch List
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {tab === 'single' ? (
          <form onSubmit={handleSubmitSingle} className="p-5 space-y-4">
            <div>
              <label htmlFor="dl-url" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Download URL
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="dl-url"
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.org/archive.tar.gz"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleProbe()}
                  disabled={!url.trim() || probing}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {probing ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Inspect URL'}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Quick verification samples:</span>
                <button
                  type="button"
                  onClick={() => loadLocalSample('/api/fixtures/file/novaload-linux-x64.tar.gz')}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Linux Archive (512 KB, Range)
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => loadLocalSample('/api/fixtures/file/dataset-telemetry-2026.zip')}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Dataset ZIP (768 KB, Range)
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => loadLocalSample('/api/fixtures/no-range/legacy-stream.bin')}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  No-Range Fallback
                </button>
              </div>
            </div>

            {probeInfo && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1119] px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="font-medium text-slate-800 dark:text-slate-200">{probeInfo.filename}</div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {probeInfo.totalBytes > 0 ? formatBytes(probeInfo.totalBytes) : 'Unknown size'} · {probeInfo.mimeType}
                  </div>
                </div>
                <span className={`font-medium ${probeInfo.supportsRanges ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {probeInfo.supportsRanges ? 'Multi-Connection Ready' : 'Single Stream Only'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="dl-filename" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  File Name (optional)
                </label>
                <input
                  id="dl-filename"
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="Auto-detected from server"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="dl-category" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category Folder
                </label>
                <select
                  id="dl-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Auto-detect by extension</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (/{c.subfolder})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="dl-queue" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Queue
                </label>
                <select
                  id="dl-queue"
                  value={queueId}
                  onChange={(e) => setQueueId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {queues.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={startImmediately}
                    onChange={(e) => setStartImmediately(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  Start transfer immediately
                </label>
              </div>
            </div>

            {/* Progressive disclosure for power users */}
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            >
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Advanced connection & integrity options
            </button>

            {showAdvanced && (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="dl-conns" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Parallel Connections ({connections})
                    </label>
                    <input
                      id="dl-conns"
                      type="range"
                      min={1}
                      max={16}
                      value={connections}
                      onChange={(e) => setConnections(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="dl-speed" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Speed Limit (KB/s, optional)
                    </label>
                    <input
                      id="dl-speed"
                      type="number"
                      min={16}
                      value={speedLimitKbps}
                      onChange={(e) => setSpeedLimitKbps(e.target.value)}
                      placeholder="Unlimited"
                      className="w-full px-3 py-1.5 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119] text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label htmlFor="dl-checksum" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Expected Checksum (optional)
                    </label>
                    <input
                      id="dl-checksum"
                      type="text"
                      value={expectedChecksum}
                      onChange={(e) => setExpectedChecksum(e.target.value)}
                      placeholder="Hex digest to verify upon completion"
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119] text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="dl-algo" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Algorithm
                    </label>
                    <select
                      id="dl-algo"
                      value={checksumAlgo}
                      onChange={(e) => setChecksumAlgo(e.target.value as 'sha256' | 'sha512')}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119] text-slate-900 dark:text-slate-100"
                    >
                      <option value="sha256">SHA-256</option>
                      <option value="sha512">SHA-512</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !url.trim()}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {startImmediately ? 'Download Now' : 'Add to Queue'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitBatch} className="p-5 space-y-4">
            <div>
              <label htmlFor="batch-urls" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Batch URLs (one per line)
              </label>
              <textarea
                id="batch-urls"
                rows={6}
                value={batchUrls}
                onChange={(e) => setBatchUrls(e.target.value)}
                placeholder={'https://example.org/file1.zip\nhttps://example.org/file2.iso'}
                className="w-full p-3 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() =>
                  setBatchUrls(
                    `${window.location.origin}/api/fixtures/file/novaload-linux-x64.tar.gz\n${window.location.origin}/api/fixtures/file/ubuntu-server-notes.pdf\n${window.location.origin}/api/fixtures/file/release-checksums.txt`
                  )
                }
                className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <Layers className="w-3.5 h-3.5" /> Load 3 local verification URLs
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label htmlFor="batch-queue" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Queue
                </label>
                <select
                  id="batch-queue"
                  value={queueId}
                  onChange={(e) => setQueueId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119] text-slate-900 dark:text-slate-100"
                >
                  {queues.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pt-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={startImmediately}
                  onChange={(e) => setStartImmediately(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600"
                />
                Start queue
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Import Batch
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
