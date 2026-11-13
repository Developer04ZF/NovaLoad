#!/usr/bin/env tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const BASE_URL = process.env.NOVALOAD_API_URL || 'http://127.0.0.1:3000';

async function apiCall(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return data;
}

async function main() {
  const [, , cmd, ...args] = process.argv;

  switch (cmd) {
    case 'version': {
      const h = (await apiCall('/api/health')) as { version: string; ok: boolean };
      console.log(`NovaLoad CLI v${h.version} (engine healthy: ${h.ok})`);
      break;
    }
    case 'download': {
      const url = args[0];
      if (!url) {
        console.error('Usage: novaload download <URL> [--connections N]');
        process.exit(1);
      }
      const connIdx = args.indexOf('--connections');
      const connections = connIdx !== -1 ? Number(args[connIdx + 1]) || 6 : 6;
      const created = (await apiCall('/api/downloads', {
        method: 'POST',
        body: JSON.stringify({ url, connections, startImmediately: true }),
      })) as { id: string; filename: string; status: string };
      console.log(`Queued download ${created.id}: ${created.filename} (${created.status})`);
      break;
    }
    case 'list': {
      const items = (await apiCall('/api/downloads')) as Array<{
        id: string;
        filename: string;
        status: string;
        progress: number;
      }>;
      if (items.length === 0) {
        console.log('No downloads found.');
        break;
      }
      for (const item of items) {
        console.log(`${item.id}  [${item.status}]  ${item.progress.toFixed(1)}%  ${item.filename}`);
      }
      break;
    }
    case 'pause': {
      const id = args[0];
      if (!id) throw new Error('Usage: novaload pause <ID>');
      await apiCall(`/api/downloads/${id}/pause`, { method: 'POST' });
      console.log(`Paused ${id}`);
      break;
    }
    case 'resume': {
      const id = args[0];
      if (!id) throw new Error('Usage: novaload resume <ID>');
      await apiCall(`/api/downloads/${id}/start`, { method: 'POST' });
      console.log(`Resumed ${id}`);
      break;
    }
    case 'cancel': {
      const id = args[0];
      if (!id) throw new Error('Usage: novaload cancel <ID>');
      await apiCall(`/api/downloads/${id}/cancel`, { method: 'POST' });
      console.log(`Cancelled ${id}`);
      break;
    }
    case 'queue': {
      const queues = (await apiCall('/api/queues')) as Array<{
        id: string;
        name: string;
        maxConcurrent: number;
      }>;
      for (const q of queues) {
        console.log(`${q.id}: ${q.name} (maxConcurrent=${q.maxConcurrent})`);
      }
      break;
    }
    default:
      console.log(
        [
          'NovaLoad CLI — Download smarter. Manage everything.',
          'Commands:',
          '  novaload download <URL> [--connections N]',
          '  novaload list',
          '  novaload pause <ID>',
          '  novaload resume <ID>',
          '  novaload cancel <ID>',
          '  novaload queue',
          '  novaload version',
        ].join('\n')
      );
  }
}

main().catch((err) => {
  console.error(`Error: ${(err as Error).message}`);
  process.exit(1);
});
