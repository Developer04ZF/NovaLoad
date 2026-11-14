#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Validates all 4 browser extension builds (Brave, Chrome, Edge, Firefox) and their packaged ZIP archives.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;
const errors = [];

const BROWSERS = [
  { id: 'brave', label: 'Brave', isFirefox: false },
  { id: 'chrome', label: 'Chrome', isFirefox: false },
  { id: 'edge', label: 'Edge', isFirefox: false },
  { id: 'firefox', label: 'Firefox', isFirefox: true },
];

for (const b of BROWSERS) {
  const dir = path.join(ROOT, 'extensions', b.id);
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    errors.push(`extensions/${b.id}/manifest.json missing.`);
    continue;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    errors.push(`extensions/${b.id}/manifest.json invalid JSON: ${(err).message}`);
    continue;
  }

  if (manifest.manifest_version !== 3) {
    errors.push(`extensions/${b.id}: manifest_version must be 3.`);
  }
  if (manifest.version !== VERSION) {
    errors.push(`extensions/${b.id}: version "${manifest.version}" != "${VERSION}".`);
  }

  // Ensure every extension is 100% self-contained with zero parent-directory traversal
  const manifestStr = JSON.stringify(manifest);
  if (manifestStr.includes('..')) {
    errors.push(`extensions/${b.id}: manifest.json must not reference parent relative paths (..).`);
  }

  for (const requiredFile of ['background.js', 'popup.html', 'popup.js', 'README.md', 'icons/icon-16.png', 'icons/icon-48.png', 'icons/icon-128.png']) {
    if (!fs.existsSync(path.join(dir, requiredFile))) {
      errors.push(`extensions/${b.id}: missing required file "${requiredFile}".`);
    }
  }

  if (b.isFirefox) {
    if (!manifest.browser_specific_settings?.gecko?.id) {
      errors.push('extensions/firefox: missing browser_specific_settings.gecko.id.');
    }
    if (!Array.isArray(manifest.background?.scripts) || !manifest.background.scripts.includes('background.js')) {
      errors.push('extensions/firefox: expected background.scripts ["background.js"] for Firefox MV3.');
    }
  } else {
    if (manifest.background?.service_worker !== 'background.js') {
      errors.push(`extensions/${b.id}: expected background.service_worker = "background.js".`);
    }
  }

  const zipName = `NovaLoad-${b.label}-Extension-v${VERSION}.zip`;
  const zipPath = path.join(ROOT, 'dist', 'extensions', zipName);
  if (!fs.existsSync(zipPath)) {
    errors.push(`dist/extensions/${zipName} not found. Run npm run build:extensions.`);
    continue;
  }

  const buf = fs.readFileSync(zipPath);
  if (buf.length < 1000 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
    errors.push(`dist/extensions/${zipName} is not a valid PKZIP archive.`);
    continue;
  }

  try {
    execFileSync('unzip', ['-t', zipPath], { stdio: 'pipe' });
  } catch (err) {
    errors.push(`dist/extensions/${zipName} failed ZIP integrity test: ${(err).message}`);
  }
}

if (errors.length > 0) {
  console.error(`Extension validation failed (${errors.length} issue(s)):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`validate:extensions passed — 4 self-contained extensions and 4 verified ZIP packages match v${VERSION}.`);
