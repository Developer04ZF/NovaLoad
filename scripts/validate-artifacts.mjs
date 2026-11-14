#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Validates built release deliverables and optionally writes/checks SHA256SUMS.txt.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;
const releaseDirIdx = process.argv.indexOf('--dir');
const RELEASE_DIR = releaseDirIdx !== -1 && process.argv[releaseDirIdx + 1]
  ? path.resolve(process.argv[releaseDirIdx + 1])
  : null;
const WRITE_CHECKSUMS = process.argv.includes('--write-checksums');

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

const errors = [];

// Local workspace checks (when no --dir release bundle directory is passed)
if (!RELEASE_DIR) {
  const distIndex = path.join(ROOT, 'dist', 'index.html');
  if (!fs.existsSync(distIndex)) {
    errors.push('Missing frontend build output dist/index.html (run npm run build).');
  }
  const serverCjs = path.join(ROOT, 'build', 'server.cjs');
  if (!fs.existsSync(serverCjs)) {
    errors.push('Missing standalone server bundle build/server.cjs (run npm run build:server).');
  }

  for (const icon of ['32x32.png', '128x128.png', '128x128@2x.png', 'icon.ico', 'icon.icns']) {
    const iconPath = path.join(ROOT, 'src-tauri', 'icons', icon);
    if (!fs.existsSync(iconPath) || fs.statSync(iconPath).size === 0) {
      errors.push(`Missing or empty Tauri icon asset: src-tauri/icons/${icon}`);
    }
  }

  for (const label of ['Brave', 'Chrome', 'Edge', 'Firefox']) {
    const zipPath = path.join(ROOT, 'dist', 'extensions', `NovaLoad-${label}-Extension-v${VERSION}.zip`);
    if (!fs.existsSync(zipPath)) {
      errors.push(`Missing browser extension release package: dist/extensions/NovaLoad-${label}-Extension-v${VERSION}.zip`);
    }
  }

  const binariesDir = path.join(ROOT, 'src-tauri', 'binaries');
  const binaries = fs.existsSync(binariesDir)
    ? fs.readdirSync(binariesDir).filter((f) => f.startsWith('novaload-server-'))
    : [];
  if (binaries.length === 0) {
    errors.push('No compiled novaload-server-* sidecar found in src-tauri/binaries/ (run npm run build:sidecar).');
  }
} else {
  if (!fs.existsSync(RELEASE_DIR)) {
    console.error(`Release directory does not exist: ${RELEASE_DIR}`);
    process.exit(1);
  }
  const files = fs
    .readdirSync(RELEASE_DIR)
    .filter((f) => f !== 'SHA256SUMS.txt' && !fs.statSync(path.join(RELEASE_DIR, f)).isDirectory())
    .sort();

  if (files.length === 0) {
    errors.push(`No release artifacts found in ${RELEASE_DIR}.`);
  }

  for (const label of ['Brave', 'Chrome', 'Edge', 'Firefox']) {
    const expectedZip = `NovaLoad-${label}-Extension-v${VERSION}.zip`;
    if (!files.includes(expectedZip)) {
      errors.push(`Missing ${expectedZip} in release output directory.`);
    }
  }

  if (WRITE_CHECKSUMS) {
    const lines = files.map((f) => `${sha256File(path.join(RELEASE_DIR, f))}  ${f}`);
    fs.writeFileSync(path.join(RELEASE_DIR, 'SHA256SUMS.txt'), lines.join('\n') + '\n');
    console.log(`Wrote SHA256SUMS.txt for ${files.length} artifacts.`);
  } else {
    const sumsPath = path.join(RELEASE_DIR, 'SHA256SUMS.txt');
    if (!fs.existsSync(sumsPath)) {
      errors.push('Missing SHA256SUMS.txt in release output directory.');
    } else {
      const content = fs.readFileSync(sumsPath, 'utf8').trim().split(/\r?\n/);
      for (const line of content) {
        const [expectedHash, name] = line.trim().split(/\s+/);
        if (!expectedHash || !name) continue;
        const target = path.join(RELEASE_DIR, name);
        if (!fs.existsSync(target)) {
          errors.push(`SHA256SUMS.txt references missing file: ${name}`);
          continue;
        }
        const actual = sha256File(target);
        if (actual !== expectedHash) {
          errors.push(`Checksum mismatch for ${name}: expected ${expectedHash}, got ${actual}`);
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`Artifact validation failed (${errors.length} issue(s)):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log('validate:artifacts passed cleanly.');
