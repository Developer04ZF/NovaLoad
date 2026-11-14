/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const HOST_TRIPLE =
  process.platform === 'linux' && process.arch === 'x64'
    ? 'x86_64-unknown-linux-gnu'
    : process.platform === 'linux' && process.arch === 'arm64'
      ? 'aarch64-unknown-linux-gnu'
      : process.platform === 'win32' && process.arch === 'x64'
        ? 'x86_64-pc-windows-msvc.exe'
        : null;

const SIDECAR_PATH = HOST_TRIPLE
  ? path.join(ROOT, 'src-tauri', 'binaries', `novaload-server-${HOST_TRIPLE}`)
  : '';

const hasCompiledSidecar = Boolean(SIDECAR_PATH && fs.existsSync(SIDECAR_PATH));

describe.skipIf(!hasCompiledSidecar)('NovaLoad Compiled Desktop Sidecar E2E', () => {
  it('boots standalone SEA binary, enforces desktop local token, downloads fixture file, and shuts down via stdin EOF', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novaload-sidecar-e2e-'));
    const child = spawn(
      SIDECAR_PATH,
      ['--desktop', '--port', '0', '--host', '127.0.0.1', '--data-dir', tempDir],
      {
        env: {
          ...process.env,
          NOVALOAD_DESKTOP: '1',
          NOVALOAD_STDIN_WATCHDOG: '1',
          NODE_ENV: 'production',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    let stderrLog = '';
    child.stderr.on('data', (chunk) => {
      stderrLog += chunk.toString();
    });

    try {
      const readyPayload = await new Promise<{ port: number; host: string; desktop: boolean; token: string }>(
        (resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Sidecar readiness timed out. stderr=${stderrLog}`));
          }, 15000);

          const rl = readline.createInterface({ input: child.stdout });
          rl.on('line', (line) => {
            if (line.startsWith('NOVALOAD_READY ')) {
              clearTimeout(timer);
              rl.close();
              resolve(JSON.parse(line.slice('NOVALOAD_READY '.length)));
            }
          });
          child.once('exit', (code) => {
            clearTimeout(timer);
            reject(new Error(`Sidecar exited prematurely with code ${code}. stderr=${stderrLog}`));
          });
        }
      );

      expect(readyPayload.desktop).toBe(true);
      expect(readyPayload.host).toBe('127.0.0.1');
      expect(readyPayload.port).toBeGreaterThan(0);
      expect(readyPayload.token.startsWith('nl_local_')).toBe(true);

      const baseUrl = `http://${readyPayload.host}:${readyPayload.port}`;

      // 1. Health endpoint works without local auth token
      const healthRes = await fetch(`${baseUrl}/api/health`);
      expect(healthRes.status).toBe(200);
      const health = (await healthRes.json()) as { ok: boolean; version: string; desktopMode: boolean };
      expect(health.ok).toBe(true);
      expect(health.version).toBe('1.0.0');
      expect(health.desktopMode).toBe(true);

      // 2. Protected API rejects unauthenticated callers
      const unauthRes = await fetch(`${baseUrl}/api/snapshot`);
      expect(unauthRes.status).toBe(401);

      // 3. Authenticated API works and serves built UI
      const authHeaders = { 'X-NovaLoad-Local-Token': readyPayload.token };
      const snapRes = await fetch(`${baseUrl}/api/snapshot`, { headers: authHeaders });
      expect(snapRes.status).toBe(200);

      const uiRes = await fetch(`${baseUrl}/`);
      expect(uiRes.status).toBe(200);
      const html = await uiRes.text();
      expect(html).toContain('NovaLoad');

      // 4. Execute real download through compiled SEA binary + node:sqlite
      const createRes = await fetch(`${baseUrl}/api/downloads`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${baseUrl}/api/fixtures/file/release-checksums.txt`,
          filename: 'sidecar-release-checksums.txt',
          connections: 4,
        }),
      });
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as { id: string };

      let finalStatus = '';
      let filePath = '';
      for (let i = 0; i < 60; i++) {
        const res = await fetch(`${baseUrl}/api/downloads/${created.id}`, { headers: authHeaders });
        const item = (await res.json()) as { status: string; filePath: string };
        if (item.status === 'completed' || item.status === 'failed') {
          finalStatus = item.status;
          filePath = item.filePath;
          break;
        }
        await new Promise((r) => setTimeout(r, 80));
      }

      expect(finalStatus).toBe('completed');
      expect(fs.existsSync(filePath)).toBe(true);

      // 5. Verify stdin EOF watchdog triggers clean shutdown with exit code 0
      const exitCode = await new Promise<number | null>((resolve, reject) => {
        const shutdownTimer = setTimeout(() => reject(new Error('Sidecar did not exit on stdin EOF')), 5000);
        child.once('exit', (code) => {
          clearTimeout(shutdownTimer);
          resolve(code);
        });
        child.stdin.end();
      });

      expect(exitCode).toBe(0);
    } finally {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 25000);
});
