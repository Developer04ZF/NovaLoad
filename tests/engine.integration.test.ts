/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import type http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServerApp, type ServerAppBundle } from '../server/app';

describe('NovaLoad Download Engine & Persistence Integration', () => {
  let bundle: ServerAppBundle;
  let server: http.Server;
  let baseUrl: string;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novaload-test-'));
    bundle = createServerApp({ dataDir: tempDir, startTimers: false });
    await new Promise<void>((resolve) => {
      server = bundle.app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        bundle.downloadManager.setLocalFixturesPort(port);
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    bundle.downloadManager.destroy();
    bundle.db.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function waitForStatus(id: string, targets: string[], timeoutMs = 12000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const res = await fetch(`${baseUrl}/api/downloads/${id}`);
      const item = (await res.json()) as {
        status: string;
        actualSha256: string | null;
        checksumVerified: boolean | null;
        supportsRanges: boolean;
        connections: number;
        segments: Array<{ downloadedBytes: number }>;
        filePath: string;
      };
      if (targets.includes(item.status)) return item;
      await new Promise((r) => setTimeout(r, 80));
    }
    throw new Error(`Timed out waiting for download ${id} to reach ${targets.join('/')}`);
  }

  it('executes multi-connection Range download and verifies SHA-256 integrity', async () => {
    const metaRes = await fetch(`${baseUrl}/api/fixtures/checksum/sample-fast.bin`);
    const expected = (await metaRes.json()) as { sha256: string; size: number };

    const createRes = await fetch(`${baseUrl}/api/downloads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${baseUrl}/api/fixtures/file/sample-fast.bin`,
        connections: 4,
        expectedChecksum: expected.sha256,
        expectedChecksumAlgo: 'sha256',
        startImmediately: true,
      }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string; connections: number; supportsRanges: boolean };
    expect(created.supportsRanges).toBe(true);
    expect(created.connections).toBe(4);

    const finished = await waitForStatus(created.id, ['completed']);
    expect(finished.actualSha256).toBe(expected.sha256);
    expect(finished.checksumVerified).toBe(true);
    expect(fs.existsSync(finished.filePath)).toBe(true);
  });

  it('falls back safely to single connection when server lacks Range support', async () => {
    const createRes = await fetch(`${baseUrl}/api/downloads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${baseUrl}/api/fixtures/no-range/legacy-stream.bin`,
        connections: 6,
        startImmediately: true,
      }),
    });
    const created = (await createRes.json()) as { id: string; connections: number; supportsRanges: boolean };
    expect(created.supportsRanges).toBe(false);
    expect(created.connections).toBe(1);

    const finished = await waitForStatus(created.id, ['completed']);
    expect(finished.status).toBe('completed');
  });

  it('follows HTTP 302 redirects safely', async () => {
    const createRes = await fetch(`${baseUrl}/api/downloads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${baseUrl}/api/fixtures/redirect/release-checksums.txt`,
        startImmediately: true,
      }),
    });
    const created = (await createRes.json()) as { id: string };
    const finished = await waitForStatus(created.id, ['completed']);
    expect(finished.status).toBe('completed');
  });

  it('supports true pause and resume mid-transfer with exact byte recovery', async () => {
    const metaRes = await fetch(`${baseUrl}/api/fixtures/checksum/sample-slow.bin`);
    const expected = (await metaRes.json()) as { sha256: string };

    const createRes = await fetch(`${baseUrl}/api/downloads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${baseUrl}/api/fixtures/file/sample-slow.bin`,
        connections: 4,
        expectedChecksum: expected.sha256,
        expectedChecksumAlgo: 'sha256',
        startImmediately: true,
      }),
    });
    const created = (await createRes.json()) as { id: string };

    await new Promise((r) => setTimeout(r, 140));
    const pauseRes = await fetch(`${baseUrl}/api/downloads/${created.id}/pause`, { method: 'POST' });
    expect(pauseRes.status).toBe(200);
    const paused = (await pauseRes.json()) as { status: string };
    expect(paused.status).toBe('paused');

    const resumeRes = await fetch(`${baseUrl}/api/downloads/${created.id}/start`, { method: 'POST' });
    expect(resumeRes.status).toBe(200);

    const finished = await waitForStatus(created.id, ['completed']);
    expect(finished.actualSha256).toBe(expected.sha256);
    expect(finished.checksumVerified).toBe(true);
  });

  it('flags mismatched checksums as failed instead of corrupting completed history', async () => {
    const createRes = await fetch(`${baseUrl}/api/downloads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${baseUrl}/api/fixtures/file/release-checksums.txt`,
        expectedChecksum: '0000000000000000000000000000000000000000000000000000000000000000',
        expectedChecksumAlgo: 'sha256',
        startImmediately: true,
      }),
    });
    const created = (await createRes.json()) as { id: string };
    // Set maxRetries 0 so failure happens immediately without backoff wait
    await fetch(`${baseUrl}/api/downloads/${created.id}`, { method: 'PATCH', body: JSON.stringify({}) });
    bundle.db.updateDownload(created.id, { maxRetries: 0 });

    const failed = await waitForStatus(created.id, ['failed']);
    expect(failed.status).toBe('failed');
  });

  it('enforces browser bridge token authentication', async () => {
    const badRes = await fetch(`${baseUrl}/api/bridge/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-novaload-token': 'invalid' },
      body: JSON.stringify({ browser: 'chrome', url: `${baseUrl}/api/fixtures/file/release-checksums.txt` }),
    });
    expect(badRes.status).toBe(401);

    const settings = bundle.db.getSettings();
    const okRes = await fetch(`${baseUrl}/api/bridge/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-novaload-token': settings.browserBridgeToken },
      body: JSON.stringify({ browser: 'firefox', url: `${baseUrl}/api/fixtures/file/release-checksums.txt` }),
    });
    expect(okRes.status).toBe(201);
    const body = (await okRes.json()) as { download: { id: string } };
    await waitForStatus(body.download.id, ['completed']);
  });

  it('passes SQLite integrity check and refuses silent file overwrites', async () => {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const health = (await healthRes.json()) as { ok: boolean; database: { ok: boolean } };
    expect(health.ok).toBe(true);
    expect(health.database.ok).toBe(true);

    const fileA = path.join(bundle.db.downloadsDir, 'a.txt');
    const fileB = path.join(bundle.db.downloadsDir, 'b.txt');
    fs.writeFileSync(fileA, 'alpha');
    fs.writeFileSync(fileB, 'beta');

    const result = await bundle.fileManager.executeApprovedActions([
      {
        id: 'test-conflict',
        type: 'rename',
        description: 'Rename a.txt to b.txt',
        sourcePath: 'a.txt',
        targetPath: 'b.txt',
        reason: 'conflict check',
        riskLevel: 'low',
      },
    ]);
    expect(result.succeeded).toBe(0);
    expect(result.failed[0].error).toContain('Conflict detected');
  });
});
