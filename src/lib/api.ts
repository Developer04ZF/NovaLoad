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

export interface DesktopBackendInfo {
  baseUrl: string;
  token: string | null;
  port: number;
  ready: boolean;
  error: string | null;
}

export interface UpdaterCheckResult {
  supported: boolean;
  status: 'up-to-date' | 'update-available' | 'unconfigured' | 'error' | 'web-mode';
  currentVersion: string;
  availableVersion?: string;
  notes?: string;
  message: string;
}

interface TauriInternals {
  invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

let cachedBaseUrl = '';
let cachedLocalToken: string | null = null;

export function isTauriDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { __TAURI_INTERNALS__?: TauriInternals };
  return Boolean(w.__TAURI_INTERNALS__ && typeof w.__TAURI_INTERNALS__.invoke === 'function');
}

export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const w = window as unknown as { __TAURI_INTERNALS__?: TauriInternals };
  if (!w.__TAURI_INTERNALS__?.invoke) {
    throw new Error('Tauri desktop runtime is not active.');
  }
  return w.__TAURI_INTERNALS__.invoke<T>(cmd, args);
}

export function getApiBaseUrl(): string {
  return cachedBaseUrl;
}

export function getEventsUrl(): string {
  const base = `${cachedBaseUrl}/api/events`;
  if (cachedLocalToken) {
    return `${base}?localToken=${encodeURIComponent(cachedLocalToken)}`;
  }
  return base;
}

export async function initBackendConnection(): Promise<DesktopBackendInfo> {
  if (!isTauriDesktop()) {
    cachedBaseUrl = '';
    cachedLocalToken = null;
    return { baseUrl: '', token: null, port: 0, ready: true, error: null };
  }

  for (let attempt = 0; attempt < 40; attempt++) {
    const info = await tauriInvoke<DesktopBackendInfo>('get_backend_info');
    if (info.error) {
      throw new Error(info.error);
    }
    if (info.ready && info.baseUrl) {
      cachedBaseUrl = info.baseUrl.replace(/\/+$/, '');
      cachedLocalToken = info.token || null;
      return info;
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  throw new Error('Timed out waiting for NovaLoad embedded backend service to become ready.');
}

export async function buildApiHeaders(extra?: HeadersInit): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cachedLocalToken) {
    headers['X-NovaLoad-Local-Token'] = cachedLocalToken;
  }
  if (extra) {
    const h = new Headers(extra);
    h.forEach((value, key) => {
      headers[key] = value;
    });
  }
  return headers;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const target = url.startsWith('http') ? url : `${cachedBaseUrl}${url}`;
  const headers = await buildApiHeaders(init?.headers);
  const res = await fetch(target, {
    ...init,
    headers,
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

  checkForUpdates: async (): Promise<UpdaterCheckResult> => {
    if (!isTauriDesktop()) {
      return {
        supported: false,
        status: 'web-mode',
        currentVersion: '1.0.0',
        message:
          'Running in web/server mode. Automatic Tauri updates apply only inside installed desktop packages; update via git pull or the latest GitHub Release.',
      };
    }
    return tauriInvoke<UpdaterCheckResult>('check_for_updates');
  },
  installUpdate: async (): Promise<{ ok: boolean; message: string }> => {
    if (!isTauriDesktop()) {
      return { ok: false, message: 'In-app update installation requires the installed Tauri desktop runtime.' };
    }
    return tauriInvoke<{ ok: boolean; message: string }>('install_update');
  },
};
