/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import type http from 'node:http';
import type net from 'node:net';
import path from 'node:path';
import { createServerApp } from './server/app.ts';
import { generateLocalSessionToken } from './server/security.ts';

function parseCliFlag(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const prefixed = process.argv.find((a) => a.startsWith(`${flag}=`));
  return prefixed ? prefixed.slice(flag.length + 1) : undefined;
}

function hasCliFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function resolveDistDir(): string | null {
  const candidates = [
    process.env.NOVALOAD_DIST_DIR,
    path.resolve(process.cwd(), 'dist'),
    path.resolve(path.dirname(process.execPath), 'dist'),
    path.resolve(path.dirname(process.execPath), '../dist'),
  ].filter(Boolean) as string[];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      return dir;
    }
  }
  return null;
}

async function bootstrap() {
  const isDesktop = hasCliFlag('--desktop') || process.env.NOVALOAD_DESKTOP === '1';
  const rawPort = parseCliFlag('--port') ?? process.env.PORT;
  const requestedPort = rawPort !== undefined ? Number(rawPort) : isDesktop ? 0 : 3000;
  const host = parseCliFlag('--host') || process.env.HOST || (isDesktop ? '127.0.0.1' : '0.0.0.0');
  const dataDir = parseCliFlag('--data-dir') || process.env.NOVALOAD_DATA_DIR;
  const localApiToken =
    parseCliFlag('--local-token') ||
    process.env.NOVALOAD_LOCAL_TOKEN ||
    (isDesktop ? generateLocalSessionToken() : undefined);

  const { app, db, downloadManager } = createServerApp({
    dataDir,
    localFixturesPort: requestedPort > 0 ? requestedPort : undefined,
    startTimers: true,
    localApiToken,
  });

  const useViteDev = !isDesktop && process.env.NODE_ENV !== 'production';
  if (useViteDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = resolveDistDir();
    if (distDir) {
      app.use(express.static(distDir));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) return next();
        return res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  let server: http.Server;
  const actualPort = await new Promise<number>((resolve, reject) => {
    server = app.listen(requestedPort, host, () => {
      const addr = server.address() as net.AddressInfo | null;
      const boundPort = addr?.port ?? requestedPort;
      downloadManager.setLocalFixturesPort(boundPort);
      resolve(boundPort);
    });
    server.on('error', reject);
  });

  const readyPayload = {
    port: actualPort,
    host,
    desktop: isDesktop,
    token: localApiToken || null,
  };
  console.log(`NovaLoad server running at http://${host}:${actualPort}`);
  console.log(`NOVALOAD_READY ${JSON.stringify(readyPayload)}`);

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    const forceTimer = setTimeout(() => {
      process.exit(0);
    }, 3500);
    forceTimer.unref();

    try {
      await downloadManager.shutdown(2500);
      db.close();
    } catch {
      // ignore close errors during teardown
    }
    server.close(() => {
      clearTimeout(forceTimer);
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  if (isDesktop && process.env.NOVALOAD_STDIN_WATCHDOG === '1') {
    process.stdin.resume();
    process.stdin.on('end', () => void shutdown());
    process.stdin.on('close', () => void shutdown());
  }
}

bootstrap().catch((err) => {
  console.error('Failed to start NovaLoad server:', err);
  process.exit(1);
});
