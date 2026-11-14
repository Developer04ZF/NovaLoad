#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ensures version numbers are synchronized across package.json, Cargo.toml,
 * tauri.conf.json, extension manifests, CHANGELOG.md, and optional release git tag.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const errors = [];

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const expected = pkg.version;

if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(expected)) {
  errors.push(`package.json version "${expected}" is not valid SemVer.`);
}

const tauriConf = JSON.parse(fs.readFileSync(path.join(ROOT, 'src-tauri', 'tauri.conf.json'), 'utf8'));
if (tauriConf.version !== expected) {
  errors.push(`src-tauri/tauri.conf.json version (${tauriConf.version}) != package.json (${expected}).`);
}

const cargoToml = fs.readFileSync(path.join(ROOT, 'src-tauri', 'Cargo.toml'), 'utf8');
const cargoMatch = /^version\s*=\s*"([^"]+)"/m.exec(cargoToml);
if (!cargoMatch || cargoMatch[1] !== expected) {
  errors.push(`src-tauri/Cargo.toml version (${cargoMatch?.[1] || 'missing'}) != package.json (${expected}).`);
}

for (const browser of ['brave', 'chrome', 'edge', 'firefox']) {
  const manifestPath = path.join(ROOT, 'extensions', browser, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    errors.push(`Missing extension manifest: extensions/${browser}/manifest.json`);
    continue;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.version !== expected) {
    errors.push(`extensions/${browser}/manifest.json version (${manifest.version}) != package.json (${expected}).`);
  }
}

const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
if (!changelog.includes(`## [${expected}]`)) {
  errors.push(`CHANGELOG.md does not contain a section for version ## [${expected}].`);
}

const envTag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME;
if (envTag && envTag.startsWith('v')) {
  const tagVer = envTag.slice(1);
  if (tagVer !== expected) {
    errors.push(`Git release tag ${envTag} does not match package.json version ${expected}.`);
  }
}

if (errors.length > 0) {
  console.error(`Version validation failed (${errors.length} issue(s)):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`validate:versions passed — all manifests, Rust crate, Tauri config, and changelog aligned at v${expected}.`);
