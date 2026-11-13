/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Trash2, Save, Clock, FolderTree, Layers } from 'lucide-react';
import type { CategoryRule, QueueConfig, ScheduleRule } from '../shared/types';
import { api } from '../lib/api';

interface QueuesAndSchedulerProps {
  section: 'queues' | 'scheduler' | 'categories';
  queues: QueueConfig[];
  categories: CategoryRule[];
  schedules: ScheduleRule[];
  onRefresh: () => void;
}

export const QueuesAndSchedulerView: React.FC<QueuesAndSchedulerProps> = ({
  section,
  queues,
  categories,
  schedules,
  onRefresh,
}) => {
  const [newQueueName, setNewQueueName] = useState('');
  const [newQueueConcurrent, setNewQueueConcurrent] = useState(2);

  const [schedName, setSchedName] = useState('');
  const [schedQueue, setSchedQueue] = useState('default');
  const [schedAction, setSchedAction] = useState<ScheduleRule['action']>('start_queue');
  const [schedTime, setSchedTime] = useState('02:00');

  const [catName, setCatName] = useState('');
  const [catSubfolder, setCatSubfolder] = useState('');
  const [catExtensions, setCatExtensions] = useState('');

  const handleSaveQueue = async (q: QueueConfig, patch: Partial<QueueConfig>) => {
    await api.saveQueue({ ...q, ...patch });
    onRefresh();
  };

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueueName.trim()) return;
    await api.saveQueue({
      id: `q_${Date.now()}`,
      name: newQueueName.trim(),
      description: 'Custom download queue',
      maxConcurrent: newQueueConcurrent,
      maxConnectionsPerDownload: 6,
      speedLimitKbps: null,
      isDefault: false,
      sortOrder: queues.length,
    });
    setNewQueueName('');
    onRefresh();
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedName.trim()) return;
    await api.saveSchedule({
      id: `sched_${Date.now()}`,
      name: schedName.trim(),
      queueId: schedQueue,
      action: schedAction,
      cronTime: schedTime,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      speedLimitKbps: schedAction === 'limit_speed' ? 2048 : null,
      enabled: true,
      lastRunAt: null,
    });
    setSchedName('');
    onRefresh();
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !catSubfolder.trim()) return;
    await api.saveCategory({
      id: catName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: catName.trim(),
      subfolder: catSubfolder.trim(),
      extensions: catExtensions
        .split(',')
        .map((x) => x.trim().toLowerCase().replace(/^\./, ''))
        .filter(Boolean),
      colorToken: 'blue',
    });
    setCatName('');
    setCatSubfolder('');
    setCatExtensions('');
    onRefresh();
  };

  if (section === 'queues') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Queue Manager</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure concurrency limits, parallel connections, and per-queue bandwidth caps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {queues.map((q) => (
            <div key={q.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {q.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{q.description}</p>
                </div>
                {q.isDefault && <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Default</span>}
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Max Concurrent</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    defaultValue={q.maxConcurrent}
                    onBlur={(e) => void handleSaveQueue(q, { maxConcurrent: Number(e.target.value) || 1 })}
                    className="w-20 px-2 py-1 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Connections / File</span>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    defaultValue={q.maxConnectionsPerDownload}
                    onBlur={(e) => void handleSaveQueue(q, { maxConnectionsPerDownload: Number(e.target.value) || 4 })}
                    className="w-20 px-2 py-1 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Speed Limit (KB/s)</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Unlimited"
                    defaultValue={q.speedLimitKbps ?? ''}
                    onBlur={(e) =>
                      void handleSaveQueue(q, {
                        speedLimitKbps: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-24 px-2 py-1 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleCreateQueue}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">New Queue Name</label>
            <input
              type="text"
              value={newQueueName}
              onChange={(e) => setNewQueueName(e.target.value)}
              placeholder="e.g., ISO Mirrors"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Max Concurrent</label>
            <input
              type="number"
              min={1}
              max={10}
              value={newQueueConcurrent}
              onChange={(e) => setNewQueueConcurrent(Number(e.target.value))}
              className="w-28 px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Queue
          </button>
        </form>
      </div>
    );
  }

  if (section === 'scheduler') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Download Scheduler</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automate queue execution windows and scheduled bandwidth caps.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] divide-y divide-slate-200 dark:divide-slate-800">
          {schedules.map((s) => (
            <div key={s.id} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{s.name}</div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono">
                    {s.cronTime} · Queue: {s.queueId} · Action: {s.action}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={(e) => void api.saveSchedule({ ...s, enabled: e.target.checked }).then(onRefresh)}
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600"
                  />
                  <span>Enabled</span>
                </label>
                <button
                  type="button"
                  onClick={() => void api.deleteSchedule(s.id).then(onRefresh)}
                  aria-label="Delete schedule"
                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-500 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleCreateSchedule}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
        >
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Rule Name</label>
            <input
              type="text"
              value={schedName}
              onChange={(e) => setSchedName(e.target.value)}
              placeholder="Start overnight sync"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Queue</label>
            <select
              value={schedQueue}
              onChange={(e) => setSchedQueue(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
            >
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Action & Time</label>
            <div className="flex gap-1.5">
              <select
                value={schedAction}
                onChange={(e) => setSchedAction(e.target.value as ScheduleRule['action'])}
                className="flex-1 px-2 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
              >
                <option value="start_queue">Start</option>
                <option value="pause_queue">Pause</option>
                <option value="limit_speed">Limit 2MB/s</option>
              </select>
              <input
                type="time"
                value={schedTime}
                onChange={(e) => setSchedTime(e.target.value)}
                className="px-2 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Add Schedule
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Download Categories</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Automatically route completed downloads into organized destination folders by file extension.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] divide-y divide-slate-200 dark:divide-slate-800">
        {categories.map((cat) => (
          <div key={cat.id} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <FolderTree className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{cat.name}</div>
                <div className="text-slate-500 dark:text-slate-400 font-mono">
                  Subfolder: /{cat.subfolder}
                </div>
              </div>
            </div>
            <div className="font-mono text-slate-600 dark:text-slate-300">
              {cat.extensions.length > 0 ? cat.extensions.map((e) => `.${e}`).join(' · ') : 'Fallback category'}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleCreateCategory}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category Name</label>
          <input
            type="text"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="e.g., Disk Images"
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subfolder</label>
          <input
            type="text"
            value={catSubfolder}
            onChange={(e) => setCatSubfolder(e.target.value)}
            placeholder="e.g., ISOs"
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Extensions (comma-separated)</label>
          <input
            type="text"
            value={catExtensions}
            onChange={(e) => setCatExtensions(e.target.value)}
            placeholder="iso, img, vmdk"
            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Save Category
        </button>
      </form>
    </div>
  );
};
