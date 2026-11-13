/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AiActionPlan,
  AiHistoryEntry,
  AiProposedAction,
  AppSettings,
  CategoryRule,
  DashboardSnapshot,
  DownloadItem,
  DuplicateGroup,
  FileInventoryItem,
  MediaProbeResult,
  PluginDescriptor,
  QueueConfig,
  ScheduleRule,
} from '../shared/types';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getSnapshot: () => requestJson<DashboardSnapshot>('/api/snapshot'),
  probeUrl: (url: string) =>
    requestJson<{
      url: string;
      finalUrl: string;
      filename: string;
      mimeType: string;
      totalBytes: number;
      supportsRanges: boolean;
      suggestedCategory: string;
    }>('/api/downloads/probe', { method: 'POST', body: JSON.stringify({ url }) }),
  createDownload: (payload: {
    url: string;
    filename?: string;
    category?: string;
    queueId?: string;
    connections?: number;
    speedLimitKbps?: number | null;
    expectedChecksum?: string | null;
    expectedChecksumAlgo?: 'sha256' | 'sha512' | null;
    startImmediately?: boolean;
    mediaFormat?: string | null;
    mediaQuality?: string | null;
  }) => requestJson<DownloadItem>('/api/downloads', { method: 'POST', body: JSON.stringify(payload) }),
  batchCreateDownloads: (urls: string[], queueId: string, startImmediately: boolean) =>
    requestJson<{ created: Array<{ url: string; ok: boolean; id?: string; error?: string }> }>(
      '/api/downloads/batch',
      { method: 'POST', body: JSON.stringify({ urls, queueId, startImmediately }) }
    ),
  startDownload: (id: string) => requestJson<DownloadItem>(`/api/downloads/${id}/start`, { method: 'POST' }),
  pauseDownload: (id: string) => requestJson<DownloadItem>(`/api/downloads/${id}/pause`, { method: 'POST' }),
  cancelDownload: (id: string) => requestJson<DownloadItem>(`/api/downloads/${id}/cancel`, { method: 'POST' }),
  retryDownload: (id: string) => requestJson<DownloadItem>(`/api/downloads/${id}/retry`, { method: 'POST' }),
  verifyDownload: (id: string, expectedChecksum?: string, algo?: 'sha256' | 'sha512') =>
    requestJson<DownloadItem>(`/api/downloads/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ expectedChecksum, algo }),
    }),
  updateDownload: (id: string, patch: Partial<DownloadItem>) =>
    requestJson<DownloadItem>(`/api/downloads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteDownload: (id: string, deleteFile = false) =>
    requestJson<{ ok: boolean }>(`/api/downloads/${id}?deleteFile=${deleteFile}`, { method: 'DELETE' }),
  pauseAll: () => requestJson<{ ok: boolean }>('/api/downloads/actions/pause-all', { method: 'POST' }),
  resumeAll: () => requestJson<{ ok: boolean }>('/api/downloads/actions/resume-all', { method: 'POST' }),

  saveQueue: (q: QueueConfig) =>
    requestJson<QueueConfig[]>('/api/queues', { method: 'POST', body: JSON.stringify(q) }),
  reorderQueues: (orderedIds: string[]) =>
    requestJson<{ ok: boolean }>('/api/queues/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    }),
  saveCategory: (cat: CategoryRule) =>
    requestJson<CategoryRule[]>('/api/categories', { method: 'POST', body: JSON.stringify(cat) }),
  saveSchedule: (s: ScheduleRule) =>
    requestJson<ScheduleRule[]>('/api/schedules', { method: 'POST', body: JSON.stringify(s) }),
  deleteSchedule: (id: string) =>
    requestJson<{ ok: boolean }>(`/api/schedules/${id}`, { method: 'DELETE' }),

  updateSettings: (patch: Partial<AppSettings>) =>
    requestJson<AppSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(patch) }),
  rotateBridgeToken: () =>
    requestJson<AppSettings>('/api/settings/rotate-bridge-token', { method: 'POST' }),
  checkHealth: () =>
    requestJson<{ ok: boolean; version: string; database: { ok: boolean; details: string } }>('/api/health'),
  exportDatabase: () => requestJson<Record<string, unknown>>('/api/database/export'),

  probeMedia: (url: string) =>
    requestJson<MediaProbeResult>('/api/media/probe', { method: 'POST', body: JSON.stringify({ url }) }),

  getFilesInventory: () =>
    requestJson<{ files: FileInventoryItem[]; duplicates: DuplicateGroup[] }>('/api/files/inventory'),
  executeFileActions: (actions: AiProposedAction[], historyId?: string) =>
    requestJson<{ succeeded: number; failed: Array<{ id: string; error: string }> }>(
      '/api/files/execute-actions',
      { method: 'POST', body: JSON.stringify({ actions, historyId }) }
    ),

  getAiStatus: () =>
    requestJson<{ configured: boolean; enabled: boolean; model: string; keySource: string }>('/api/ai/status'),
  testAiConnection: (model?: string) =>
    requestJson<{ ok: boolean; message: string; latencyMs: number }>('/api/ai/test', {
      method: 'POST',
      body: JSON.stringify({ model }),
    }),
  analyzeWithAi: (prompt: string) =>
    requestJson<{ plan: AiActionPlan; historyEntry: AiHistoryEntry }>('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),
  getAiHistory: () => requestJson<AiHistoryEntry[]>('/api/ai/history'),
  clearAiHistory: () => requestJson<{ ok: boolean }>('/api/ai/history', { method: 'DELETE' }),

  getBridgeStatus: () =>
    requestJson<{
      enabled: boolean;
      tokenPreview: string;
      recentCaptures: Array<{
        id: string;
        browser: string;
        url: string;
        filename: string | null;
        created_at: string;
      }>;
    }>('/api/bridge/status'),

  getPlugins: () => requestJson<PluginDescriptor[]>('/api/plugins'),
  togglePlugin: (id: string, enabled: boolean) =>
    requestJson<PluginDescriptor[]>(`/api/plugins/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),
};
