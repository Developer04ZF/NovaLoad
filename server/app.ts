/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'node:fs';
import { z } from 'zod';
import { NovaDatabase } from './db.ts';
import { DownloadManager } from './engine/downloadManager.ts';
import { createFixtureRouter } from './routes/fixtures.ts';
import { generateBridgeToken, redactSecrets, validateDownloadUrl } from './security.ts';
import { FileManagerService } from './services/fileManager.ts';
import { GeminiAssistantService } from './services/geminiService.ts';
import { MediaService } from './services/mediaService.ts';
import type { AiProposedAction, AppSettings, CategoryRule, QueueConfig, ScheduleRule } from '../src/shared/types.ts';

export interface ServerAppBundle {
  app: express.Express;
  db: NovaDatabase;
  downloadManager: DownloadManager;
  fileManager: FileManagerService;
  mediaService: MediaService;
  geminiService: GeminiAssistantService;
}

const createDownloadSchema = z.object({
  url: z.string().min(1),
  filename: z.string().optional(),
  category: z.string().optional(),
  queueId: z.string().optional(),
  connections: z.number().int().min(1).max(16).optional(),
  speedLimitKbps: z.number().int().positive().nullable().optional(),
  expectedChecksum: z.string().nullable().optional(),
  expectedChecksumAlgo: z.enum(['sha256', 'sha512']).nullable().optional(),
  startImmediately: z.boolean().optional(),
  priority: z.number().int().optional(),
  mediaFormat: z.string().nullable().optional(),
  mediaQuality: z.string().nullable().optional(),
});

export function createServerApp(options: { dataDir?: string; localFixturesPort?: number; startTimers?: boolean } = {}): ServerAppBundle {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const db = new NovaDatabase(options.dataDir);
  const downloadManager = new DownloadManager(db, {
    localFixturesPort: options.localFixturesPort,
    startTimers: options.startTimers,
  });
  const fileManager = new FileManagerService(db);
  const mediaService = new MediaService(downloadManager);
  const geminiService = new GeminiAssistantService(db, fileManager);

  // Deterministic local fixture server for testing & instant verification
  app.use('/api/fixtures', createFixtureRouter());

  // Health & DB integrity
  app.get('/api/health', (_req, res) => {
    const integrity = db.checkIntegrity();
    res.json({ ok: integrity.ok, version: '1.0.0', database: integrity });
  });

  // Full dashboard snapshot
  app.get('/api/snapshot', (_req, res) => {
    res.json(downloadManager.getSnapshot());
  });

  // Real-time SSE stream
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendSnapshot = (snap: unknown) => {
      res.write(`event: snapshot\ndata: ${JSON.stringify(snap)}\n\n`);
    };

    sendSnapshot(downloadManager.getSnapshot());
    downloadManager.on('snapshot', sendSnapshot);

    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
      downloadManager.off('snapshot', sendSnapshot);
    });
  });

  // Probe URL metadata before adding
  app.post('/api/downloads/probe', async (req, res) => {
    try {
      const url = String(req.body?.url || '');
      const result = await downloadManager.probeUrl(url);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // List downloads
  app.get('/api/downloads', (_req, res) => {
    res.json(db.getAllDownloads(true));
  });

  // Get single download details
  app.get('/api/downloads/:id', (req, res) => {
    const item = db.getDownload(req.params.id, true);
    if (!item) return res.status(404).json({ error: 'Download not found.' });
    res.json(item);
  });

  // Create new download
  app.post('/api/downloads', async (req, res) => {
    const parsed = createDownloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join('; ') });
    }
    try {
      const item = await downloadManager.createDownload(parsed.data);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ error: redactSecrets((err as Error).message) });
    }
  });

  // Batch create downloads
  app.post('/api/downloads/batch', async (req, res) => {
    const urls = Array.isArray(req.body?.urls) ? (req.body.urls as string[]) : [];
    const queueId = typeof req.body?.queueId === 'string' ? req.body.queueId : 'default';
    const startImmediately = req.body?.startImmediately !== false;
    const results: { url: string; ok: boolean; id?: string; error?: string }[] = [];

    for (const rawUrl of urls.slice(0, 50)) {
      const url = String(rawUrl).trim();
      if (!url) continue;
      try {
        const created = await downloadManager.createDownload({ url, queueId, startImmediately });
        results.push({ url, ok: true, id: created.id });
      } catch (err) {
        results.push({ url, ok: false, error: (err as Error).message });
      }
    }
    res.status(201).json({ created: results });
  });

  // Download lifecycle actions
  app.post('/api/downloads/:id/start', async (req, res) => {
    const item = await downloadManager.startOrResumeDownload(req.params.id);
    if (!item) return res.status(404).json({ error: 'Download not found.' });
    res.json(item);
  });

  app.post('/api/downloads/:id/pause', async (req, res) => {
    const item = await downloadManager.pauseDownload(req.params.id);
    if (!item) return res.status(404).json({ error: 'Download not found.' });
    res.json(item);
  });

  app.post('/api/downloads/:id/cancel', async (req, res) => {
    const item = await downloadManager.cancelDownload(req.params.id);
    if (!item) return res.status(404).json({ error: 'Download not found.' });
    res.json(item);
  });

  app.post('/api/downloads/:id/retry', async (req, res) => {
    const item = await downloadManager.retryDownload(req.params.id);
    if (!item) return res.status(404).json({ error: 'Download not found.' });
    res.json(item);
  });

  app.patch('/api/downloads/:id', (req, res) => {
    const existing = db.getDownload(req.params.id, false);
    if (!existing) return res.status(404).json({ error: 'Download not found.' });
    const patch: Record<string, unknown> = {};
    if (typeof req.body?.priority === 'number') patch.priority = req.body.priority;
    if (typeof req.body?.queueId === 'string') patch.queueId = req.body.queueId;
    if (typeof req.body?.category === 'string') patch.category = req.body.category;
    if (req.body?.speedLimitKbps === null || typeof req.body?.speedLimitKbps === 'number') {
      patch.speedLimitKbps = req.body.speedLimitKbps;
    }
    db.updateDownload(req.params.id, patch);
    downloadManager.emit('snapshot', downloadManager.getSnapshot());
    res.json(db.getDownload(req.params.id, true));
  });

  app.delete('/api/downloads/:id', async (req, res) => {
    await downloadManager.cancelDownload(req.params.id);
    const deleteFile = req.query.deleteFile === 'true';
    const existing = db.getDownload(req.params.id, false);
    if (deleteFile && existing?.filePath && fs.existsSync(existing.filePath)) {
      await fs.promises.unlink(existing.filePath).catch(() => {});
    }
    db.deleteDownload(req.params.id);
    downloadManager.emit('snapshot', downloadManager.getSnapshot());
    res.json({ ok: true });
  });

  app.post('/api/downloads/actions/pause-all', async (_req, res) => {
    await downloadManager.pauseAll();
    res.json({ ok: true });
  });

  app.post('/api/downloads/actions/resume-all', async (_req, res) => {
    await downloadManager.resumeAll();
    res.json({ ok: true });
  });

  // Verify checksum on demand for completed file
  app.post('/api/downloads/:id/verify', async (req, res) => {
    const item = db.getDownload(req.params.id, false);
    if (!item) return res.status(404).json({ error: 'Download not found.' });
    if (!fs.existsSync(item.filePath)) {
      return res.status(400).json({ error: 'Downloaded file not found on disk.' });
    }
    const { sha256, sha512 } = await downloadManager.computeHashes(item.filePath);
    const expected = typeof req.body?.expectedChecksum === 'string' ? req.body.expectedChecksum.trim().toLowerCase() : item.expectedChecksum;
    const algo = req.body?.algo === 'sha512' ? 'sha512' : item.expectedChecksumAlgo || 'sha256';
    const verified = expected ? (algo === 'sha512' ? sha512 : sha256).toLowerCase() === expected : null;

    db.updateDownload(item.id, {
      actualSha256: sha256,
      actualSha512: sha512,
      expectedChecksum: expected || null,
      expectedChecksumAlgo: expected ? algo : null,
      checksumVerified: verified,
    });
    downloadManager.emit('snapshot', downloadManager.getSnapshot());
    res.json(db.getDownload(item.id, true));
  });

  // Queues
  app.get('/api/queues', (_req, res) => res.json(db.getQueues()));
  app.post('/api/queues', (req, res) => {
    const q = req.body as QueueConfig;
    if (!q?.id || !q?.name) return res.status(400).json({ error: 'Queue id and name required.' });
    db.upsertQueue(q);
    downloadManager.emit('snapshot', downloadManager.getSnapshot());
    res.json(db.getQueues());
  });

  // Reorder queue priorities
  app.post('/api/queues/reorder', (req, res) => {
    const orderedIds = Array.isArray(req.body?.orderedIds) ? (req.body.orderedIds as string[]) : [];
    const total = orderedIds.length;
    orderedIds.forEach((id, index) => {
      db.updateDownload(id, { priority: total - index });
    });
    downloadManager.emit('snapshot', downloadManager.getSnapshot());
    res.json({ ok: true });
  });

  // Categories
  app.get('/api/categories', (_req, res) => res.json(db.getCategories()));
  app.post('/api/categories', (req, res) => {
    const cat = req.body as CategoryRule;
    if (!cat?.id || !cat?.name) return res.status(400).json({ error: 'Category id and name required.' });
    db.upsertCategory(cat);
    downloadManager.emit('snapshot', downloadManager.getSnapshot());
    res.json(db.getCategories());
  });

  // Schedules
  app.get('/api/schedules', (_req, res) => res.json(db.getSchedules()));
  app.post('/api/schedules', (req, res) => {
    const sched = req.body as ScheduleRule;
    if (!sched?.id || !sched?.name) return res.status(400).json({ error: 'Schedule id and name required.' });
    db.upsertSchedule(sched);
    downloadManager.emit('snapshot', downloadManager.getSnapshot());
    res.json(db.getSchedules());
  });
  app.delete('/api/schedules/:id', (req, res) => {
    db.deleteSchedule(req.params.id);
    downloadManager.emit('snapshot', downloadManager.getSnapshot());
    res.json({ ok: true });
  });

  // Settings & Database Maintenance
  app.get('/api/settings', (_req, res) => res.json(db.getSettings()));
  app.put('/api/settings', (req, res) => {
    const current = db.getSettings();
    const updated: AppSettings = { ...current, ...(req.body as Partial<AppSettings>) };
    db.saveSettings(updated);
    downloadManager.emit('snapshot', downloadManager.getSnapshot());
    res.json(updated);
  });

  app.post('/api/settings/rotate-bridge-token', (_req, res) => {
    const current = db.getSettings();
    const updated = db.saveSettings({ ...current, browserBridgeToken: generateBridgeToken() });
    downloadManager.emit('snapshot', downloadManager.getSnapshot());
    res.json(updated);
  });

  app.get('/api/database/export', (_req, res) => {
    res.json(db.exportSnapshot());
  });

  // Media / Video Downloader
  app.post('/api/media/probe', async (req, res) => {
    try {
      const url = String(req.body?.url || '');
      const result = await mediaService.probeMediaUrl(url);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // File Management & Duplicates
  app.get('/api/files/inventory', async (_req, res) => {
    try {
      const files = await fileManager.scanDownloadsDirectory();
      const duplicates = await fileManager.findDuplicates();
      res.json({ files, duplicates });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/files/execute-actions', async (req, res) => {
    try {
      const actions = Array.isArray(req.body?.actions) ? (req.body.actions as AiProposedAction[]) : [];
      const historyId = typeof req.body?.historyId === 'string' ? req.body.historyId : null;
      const result = await fileManager.executeApprovedActions(actions);
      if (historyId) {
        db.updateAiHistoryStatus(historyId, 'executed', result.succeeded);
      }
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Gemini AI Assistant (server-side only)
  app.get('/api/ai/status', (_req, res) => {
    res.json(geminiService.getStatus(db.getSettings()));
  });

  app.post('/api/ai/test', async (req, res) => {
    const settings = db.getSettings();
    const model = req.body?.model === 'gemini-3.1-flash-lite' ? 'gemini-3.1-flash-lite' : settings.aiModel;
    const result = await geminiService.testConnection(model);
    res.json(result);
  });

  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const prompt = String(req.body?.prompt || '').trim();
      if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });
      const result = await geminiService.analyzeAndPropose(prompt);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: redactSecrets((err as Error).message) });
    }
  });

  app.get('/api/ai/history', (_req, res) => {
    res.json(db.getAiHistory());
  });

  app.delete('/api/ai/history', (_req, res) => {
    db.clearAiHistory();
    res.json({ ok: true });
  });

  // Browser Extension Bridge
  app.get('/api/bridge/status', (_req, res) => {
    const settings = db.getSettings();
    const recent = db.db
      .prepare('SELECT * FROM browser_captures ORDER BY created_at DESC LIMIT 20')
      .all();
    res.json({
      enabled: settings.browserBridgeEnabled,
      tokenPreview: `${settings.browserBridgeToken.slice(0, 14)}…`,
      recentCaptures: recent,
    });
  });

  app.post('/api/bridge/capture', async (req, res) => {
    const settings = db.getSettings();
    if (!settings.browserBridgeEnabled) {
      return res.status(403).json({ error: 'Browser bridge is disabled in NovaLoad settings.' });
    }

    const token = req.headers['x-novaload-token'] || req.body?.token;
    if (token !== settings.browserBridgeToken) {
      return res.status(401).json({ error: 'Invalid NovaLoad browser bridge token.' });
    }

    const url = String(req.body?.url || '').trim();
    const browser = String(req.body?.browser || 'chrome').slice(0, 32);
    const filename = typeof req.body?.filename === 'string' ? req.body.filename : null;
    const referrer = typeof req.body?.referrer === 'string' ? req.body.referrer : null;

    const urlCheck = validateDownloadUrl(url, {
      blockPrivateIps: settings.privacyBlockPrivateIps,
      allowLocalFixturesPort: downloadManager.getLocalFixturesPort(),
    });
    if (!urlCheck.valid) {
      return res.status(400).json({ error: urlCheck.reason });
    }

    try {
      const created = await downloadManager.createDownload({
        url,
        filename: filename || undefined,
        startImmediately: true,
      });
      db.logBrowserCapture(browser, url, created.filename, referrer, created.id);
      res.status(201).json({ ok: true, download: created });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Plugins
  app.get('/api/plugins', (_req, res) => res.json(db.getPlugins()));
  app.post('/api/plugins/:id/toggle', (req, res) => {
    db.togglePlugin(req.params.id, Boolean(req.body?.enabled));
    res.json(db.getPlugins());
  });

  return { app, db, downloadManager, fileManager, mediaService, geminiService };
}
