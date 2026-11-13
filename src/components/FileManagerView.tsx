/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { FolderOpen, RefreshCw, Copy, Trash2, ArrowRightLeft, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { AiProposedAction, DuplicateGroup, FileInventoryItem } from '../shared/types';
import { api } from '../lib/api';
import { formatBytes } from '../lib/format';
import { NovaIllustration } from './svg/NovaIllustrations';

export const FileManagerView: React.FC = () => {
  const [files, setFiles] = useState<FileInventoryItem[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pendingActions, setPendingActions] = useState<AiProposedAction[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<FileInventoryItem | null>(null);
  const [newNameInput, setNewNameInput] = useState('');

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await api.getFilesInventory();
      setFiles(data.files);
      setDuplicates(data.duplicates);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInventory();
  }, []);

  const totalBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);
  const categoryTotals = files.reduce<Record<string, number>>((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + f.sizeBytes;
    return acc;
  }, {});

  const filteredFiles = files.filter(
    (f) =>
      f.filename.toLowerCase().includes(search.toLowerCase()) ||
      f.relativePath.toLowerCase().includes(search.toLowerCase())
  );

  const stageAction = (action: AiProposedAction) => {
    setPendingActions((prev) => [...prev.filter((a) => a.sourcePath !== action.sourcePath), action]);
  };

  const handleConfirmPending = async () => {
    if (pendingActions.length === 0) return;
    const res = await api.executeFileActions(pendingActions);
    setPendingActions([]);
    setStatusMessage(
      res.failed.length > 0
        ? `Executed ${res.succeeded} action(s), ${res.failed.length} failed: ${res.failed[0].error}`
        : `Successfully executed ${res.succeeded} file operation(s).`
    );
    await loadInventory();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Intelligent File Manager</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Inspect downloaded files on disk, detect SHA-256 duplicates, analyze storage usage, and review changes before execution.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadInventory()}
          className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121722] hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Rescan Disk
        </button>
      </div>

      {statusMessage && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> {statusMessage}
          </span>
          <button type="button" onClick={() => setStatusMessage(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Storage Visualization */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Storage Breakdown</span>
          <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
            {files.length} files · {formatBytes(totalBytes)} total
          </span>
        </div>

        {totalBytes > 0 ? (
          <>
            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              {Object.entries(categoryTotals).map(([cat, size], idx) => {
                const colors = ['bg-blue-600', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-cyan-500', 'bg-slate-500'];
                const pct = Math.max(2, (size / totalBytes) * 100);
                return <div key={cat} className={colors[idx % colors.length]} style={{ width: `${pct}%` }} title={`${cat}: ${formatBytes(size)}`} />;
              })}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
              {Object.entries(categoryTotals).map(([cat, size]) => (
                <span key={cat} className="font-mono tabular-nums">
                  {cat}: {formatBytes(size)}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">No completed files found in downloads directory yet.</p>
        )}
      </div>

      {/* Staged Pending Actions (Preview & Confirm) */}
      {pendingActions.length > 0 && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/20 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200 inline-flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Review Staged File Operations ({pendingActions.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingActions([])}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmPending()}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
              >
                Confirm & Execute
              </button>
            </div>
          </div>
          <div className="divide-y divide-amber-200/70 dark:divide-amber-900/50 text-xs">
            {pendingActions.map((a) => (
              <div key={a.id} className="py-2 flex items-center justify-between gap-2">
                <div>
                  <span className="font-semibold uppercase mr-2">{a.type}</span>
                  <span className="font-mono">{a.sourcePath}</span>
                  {a.targetPath && <span className="font-mono"> → {a.targetPath}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => setPendingActions((prev) => prev.filter((x) => x.id !== a.id))}
                  className="text-slate-600 dark:text-slate-300 underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate Detection */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-1.5">
          <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Exact SHA-256 Duplicates ({duplicates.length} group{duplicates.length === 1 ? '' : 's'})
        </h2>
        {duplicates.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">No duplicate file contents detected on disk.</p>
        ) : (
          <div className="space-y-3">
            {duplicates.map((grp) => (
              <div key={grp.sha256} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs space-y-2">
                <div className="flex items-center justify-between font-mono text-slate-500 dark:text-slate-400">
                  <span>SHA-256: {grp.sha256.slice(0, 20)}…</span>
                  <span>{formatBytes(grp.sizeBytes)} each</span>
                </div>
                {grp.files.map((f, idx) => (
                  <div key={f.id} className="flex items-center justify-between gap-2">
                    <span className="font-mono text-slate-800 dark:text-slate-200 truncate">{f.relativePath}</span>
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          stageAction({
                            id: `dup_${f.id}`,
                            type: 'delete_duplicate',
                            description: `Remove duplicate copy ${f.relativePath}`,
                            sourcePath: f.relativePath,
                            targetPath: null,
                            reason: 'Identical SHA-256 content hash',
                            riskLevel: 'medium',
                          })
                        }
                        className="text-red-600 dark:text-red-400 hover:underline shrink-0"
                      >
                        Stage Delete Copy
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Inventory Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Files on Disk (Largest First)</h2>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter files..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
            />
          </div>
        </div>

        {filteredFiles.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center">
            <NovaIllustration scene="file-organization" width={160} height={106} />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              Completed downloads stored in your NovaLoad folder appear here for inspection and safe organization.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-4">File</th>
                  <th className="py-2.5 px-3">Folder</th>
                  <th className="py-2.5 px-3 text-right">Size</th>
                  <th className="py-2.5 px-3">SHA-256</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {filteredFiles.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100">{f.filename}</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono">{f.category}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatBytes(f.sizeBytes)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">{f.sha256.slice(0, 14)}…</td>
                    <td className="py-2.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setRenameTarget(f);
                          setNewNameInput(f.filename);
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        <ArrowRightLeft className="w-3 h-3" /> Rename
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          stageAction({
                            id: `del_${f.id}`,
                            type: 'delete_duplicate',
                            description: `Delete ${f.relativePath}`,
                            sourcePath: f.relativePath,
                            targetPath: null,
                            reason: 'Manual cleanup request',
                            riskLevel: 'high',
                          })
                        }
                        className="text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Stage Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-blue-600" /> Stage File Rename
            </h3>
            <input
              type="text"
              value={newNameInput}
              onChange={(e) => setNewNameInput(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newNameInput.trim() && newNameInput.trim() !== renameTarget.filename) {
                    stageAction({
                      id: `ren_${renameTarget.id}`,
                      type: 'rename',
                      description: `Rename ${renameTarget.filename} to ${newNameInput.trim()}`,
                      sourcePath: renameTarget.relativePath,
                      targetPath: newNameInput.trim(),
                      reason: 'User-initiated rename',
                      riskLevel: 'low',
                    });
                  }
                  setRenameTarget(null);
                }}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white"
              >
                Stage Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
