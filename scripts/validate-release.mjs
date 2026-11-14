#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pre-flight release readiness verifier combining versions, governance, workflows,
 * documentation links, extension archives, and local build artifacts.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const errors = [];

const requiredFiles = [
  'LICENSE',
  'README.md',
  'CHANGELOG.md',
  'SECURITY.md',
  'THIRD_PARTY_LICENSES.md',
  'package.json',
  'package-lock.json',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  '.github/workflows/security-audit.yml',
  'src-tauri/tauri.conf.json',
  'src-tauri/Cargo.toml',
  'docs/releases/README.md',
  'docs/releases/building-releases.md',
  'docs/releases/platform-support.md',
  'docs/releases/browser-extensions.md',
  'docs/releases/code-signing.md',
  'docs/releases/updating.md',
  'docs/releases/release-checklist.md',
];

for (const rel of requiredFiles) {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    errors.push(`Missing required release/governance file: ${rel}`);
  }
}

if (errors.length > 0) {
  console.error(`Release readiness check failed (${errors.length} missing file(s)):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

for (const script of [
  'scripts/validate-versions.mjs',
  'scripts/validate-extensions.mjs',
  'scripts/validate-docs.mjs',
  'scripts/validate-artifacts.mjs',
]) {
  execFileSync(process.execPath, [path.join(ROOT, script)], { stdio: 'inherit' });
}

console.log('validate:release passed — repository is ready for tagged release automation.');
