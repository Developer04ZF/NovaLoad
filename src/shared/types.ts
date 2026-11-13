/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DownloadStatus =
  | 'queued'
  | 'probing'
  | 'downloading'
  | 'paused'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ChecksumAlgorithm = 'sha256' | 'sha512';

export interface DownloadSegment {
  id: number;
  downloadId: string;
  segmentIndex: number;
  startByte: number;
  endByte: number;
  downloadedBytes: number;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'error';
  speedBps: number;
}

export interface DownloadEvent {
  id: number;
  downloadId: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  createdAt: string;
}

export interface DownloadItem {
  id: string;
  url: string;
  finalUrl: string;
  filename: string;
  destinationDir: string;
  filePath: string;
  category: string;
  queueId: string;
  priority: number;
  mimeType: string;
  totalBytes: number;
  downloadedBytes: number;
  progress: number;
  speedBps: number;
  etaSeconds: number | null;
  status: DownloadStatus;
  supportsRanges: boolean;
  connections: number;
  speedLimitKbps: number | null;
  etag: string | null;
  expectedChecksum: string | null;
  expectedChecksumAlgo: ChecksumAlgorithm | null;
  actualSha256: string | null;
  actualSha512: string | null;
  checksumVerified: boolean | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  mediaFormat: string | null;
  mediaQuality: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  segments?: DownloadSegment[];
  events?: DownloadEvent[];
}

export interface QueueConfig {
  id: string;
  name: string;
  description: string;
  maxConcurrent: number;
  maxConnectionsPerDownload: number;
  speedLimitKbps: number | null;
  isDefault: boolean;
  sortOrder: number;
  activeCount?: number;
  queuedCount?: number;
}

export interface CategoryRule {
  id: string;
  name: string;
  subfolder: string;
  extensions: string[];
  colorToken: string;
}

export interface ScheduleRule {
  id: string;
  name: string;
  queueId: string;
  action: 'start_queue' | 'pause_queue' | 'limit_speed';
  cronTime: string; // HH:MM 24h
  daysOfWeek: number[]; // 0-6
  speedLimitKbps: number | null;
  enabled: boolean;
  lastRunAt: string | null;
}

export type ThemeMode = 'dark' | 'light' | 'system';
export type LocaleCode = 'en' | 'fa' | 'ar';

export interface AppSettings {
  theme: ThemeMode;
  locale: LocaleCode;
  defaultDownloadDir: string;
  defaultConnections: number;
  maxGlobalConcurrent: number;
  globalSpeedLimitKbps: number | null;
  clipboardMonitoring: boolean;
  autoCategorize: boolean;
  verifyChecksumOnComplete: boolean;
  autoRetry: boolean;
  maxRetries: number;
  notifyOnComplete: boolean;
  notifyOnError: boolean;
  minimizeToTray: boolean;
  launchOnStartup: boolean;
  browserBridgeEnabled: boolean;
  browserBridgeToken: string;
  aiEnabled: boolean;
  aiModel: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
  aiRequireConfirmation: boolean;
  aiAllowFileMetadata: boolean;
  aiAllowFileContent: boolean;
  releaseChannel: 'stable' | 'beta';
  privacyBlockPrivateIps: boolean;
}

export interface BandwidthPoint {
  timestamp: number;
  speedBps: number;
  activeCount: number;
}

export interface DashboardSnapshot {
  downloads: DownloadItem[];
  queues: QueueConfig[];
  categories: CategoryRule[];
  schedules: ScheduleRule[];
  settings: AppSettings;
  bandwidthHistory: BandwidthPoint[];
  stats: {
    currentSpeedBps: number;
    peakSpeedBps: number;
    totalDownloadedBytes: number;
    activeCount: number;
    queuedCount: number;
    pausedCount: number;
    completedCount: number;
    failedCount: number;
  };
}

export interface MediaFormatOption {
  id: string;
  label: string;
  container: string;
  resolution: string;
  codec: string;
  bitrateKbps: number | null;
  estimatedBytes: number | null;
  audioOnly: boolean;
  downloadUrl: string;
}

export interface MediaProbeResult {
  sourceUrl: string;
  title: string;
  durationSeconds: number | null;
  extractor: string;
  supportsAudioExtraction: boolean;
  drmProtected: boolean;
  formats: MediaFormatOption[];
  warning: string | null;
}

export interface FileInventoryItem {
  id: string;
  filename: string;
  relativePath: string;
  absolutePath: string;
  category: string;
  sizeBytes: number;
  extension: string;
  sha256: string;
  modifiedAt: string;
}

export interface DuplicateGroup {
  sha256: string;
  sizeBytes: number;
  files: FileInventoryItem[];
}

export interface AiProposedAction {
  id: string;
  type: 'move' | 'rename' | 'delete_duplicate' | 'create_folder';
  description: string;
  sourcePath: string;
  targetPath: string | null;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface AiActionPlan {
  summary: string;
  answer: string;
  actions: AiProposedAction[];
  modelUsed: string;
  generatedAt: string;
}

export interface AiHistoryEntry {
  id: string;
  prompt: string;
  model: string;
  summary: string;
  answer: string;
  proposedActionsJson: string;
  executedCount: number;
  status: 'analyzed' | 'executed' | 'dismissed' | 'error';
  createdAt: string;
}

export interface PluginDescriptor {
  id: string;
  name: string;
  version: string;
  category:
    | 'download-provider'
    | 'media-extractor'
    | 'file-processor'
    | 'notification'
    | 'ai-provider'
    | 'browser-bridge'
    | 'categorization';
  author: string;
  description: string;
  permissions: string[];
  enabled: boolean;
  builtIn: boolean;
}
