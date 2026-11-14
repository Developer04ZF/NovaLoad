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

const ROOT = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION: string = pkg.version;

describe('NovaLoad Browser Extensions & Bridge Integration', () => {
  let bundle: ServerAppBundle;
  let server: http.Server;
  let baseUrl: string;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novaload-ext-test-'));
    bundle = createServerApp({
      dataDir: tempDir,
      startTimers: false,
      localApiToken: 'nl_local_bridge_isolation_check',
    });
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
    await bundle.downloadManager.shutdown();
    bundle.db.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('ships self-contained Manifest V3 builds and valid ZIP packages for Brave, Chrome, Edge, and Firefox', () => {
    const browsers = [
      { id: 'brave', label: 'Brave', isFirefox: false },
      { id: 'chrome', label: 'Chrome', isFirefox: false },
      { id: 'edge', label: 'Edge', isFirefox: false },
      { id: 'firefox', label: 'Firefox', isFirefox: true },
    ];

    for (const b of browsers) {
      const extDir = path.join(ROOT, 'extensions', b.id);
      const manifestPath = path.join(extDir, 'manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      expect(manifest.manifest_version).toBe(3);
      expect(manifest.version).toBe(VERSION);
      expect(JSON.stringify(manifest)).not.toContain('..');
      expect(manifest.host_permissions).toContain('http://127.0.0.1/*');

      for (const reqFile of ['background.js', 'popup.html', 'popup.js', 'README.md', 'icons/icon-16.png', 'icons/icon-48.png', 'icons/icon-128.png']) {
        expect(fs.existsSync(path.join(extDir, reqFile))).toBe(true);
      }

      if (b.isFirefox) {
        expect(manifest.browser_specific_settings?.gecko?.id).toBe('bridge@novaload.org');
        expect(manifest.background?.scripts).toEqual(['background.js']);
      } else {
        expect(manifest.background?.service_worker).toBe('background.js');
      }

      const zipPath = path.join(ROOT, 'dist', 'extensions', `NovaLoad-${b.label}-Extension-v${VERSION}.zip`);
      expect(fs.existsSync(zipPath)).toBe(true);
      const header = fs.readFileSync(zipPath).subarray(0, 2);
      expect(header.toString('ascii')).toBe('PK');
    }
  });

  it('authenticates extension /api/bridge/ping independently of desktop localApiToken and captures downloads', async () => {
    const settings = bundle.db.getSettings();

    const invalidPing = await fetch(`${baseUrl}/api/bridge/ping`, {
      headers: {
        Origin: 'chrome-extension://testextensionidabcdefghijklmnop',
        'x-novaload-token': 'wrong-token',
      },
    });
    expect(invalidPing.status).toBe(401);

    const validPing = await fetch(`${baseUrl}/api/bridge/ping`, {
      headers: {
        Origin: 'moz-extension://12345678-1234-1234-1234-1234567890ab',
        'x-novaload-token': settings.browserBridgeToken,
      },
    });
    expect(validPing.status).toBe(200);
    const pingBody = (await validPing.json()) as { ok: boolean; version: string; bridgeEnabled: boolean };
    expect(pingBody.ok).toBe(true);
    expect(pingBody.version).toBe(VERSION);
    expect(pingBody.bridgeEnabled).toBe(true);

    const captureRes = await fetch(`${baseUrl}/api/bridge/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'chrome-extension://testextensionidabcdefghijklmnop',
        'x-novaload-token': settings.browserBridgeToken,
      },
      body: JSON.stringify({
        browser: 'brave',
        url: `${baseUrl}/api/fixtures/file/release-checksums.txt`,
        filename: 'bridge-verified.txt',
      }),
    });
    expect(captureRes.status).toBe(201);
    const capBody = (await captureRes.json()) as { ok: boolean; download: { id: string; filename: string } };
    expect(capBody.ok).toBe(true);
    expect(capBody.download.filename).toBe('bridge-verified.txt');
  });
});
