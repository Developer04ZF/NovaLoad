#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bundles the NovaLoad Express + SQLite backend into build/server.cjs for standalone Node execution
 * and Node 22 Single Executable Application (SEA) desktop sidecar compilation.
 */

import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'build');
const OUT_FILE = path.join(OUT_DIR, 'server.cjs');

fs.mkdirSync(OUT_DIR, { recursive: true });

await build({
  entryPoints: [path.join(ROOT, 'server.ts')],
  outfile: OUT_FILE,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  minify: true,
  sourcemap: false,
  external: ['vite'],
  logLevel: 'info',
});

const stat = fs.statSync(OUT_FILE);
console.log(`Built standalone backend bundle: ${path.relative(ROOT, OUT_FILE)} (${(stat.size / 1024).toFixed(1)} KiB)`);
