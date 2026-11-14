#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Generates crisp NovaLoad PNG, ICO, and Apple ICNS icons for Tauri desktop bundles
 * and browser extensions using pure Node PNG / binary container builders + ImageMagick fallback.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TAURI_ICONS_DIR = path.join(ROOT, 'src-tauri', 'icons');
const EXT_ICONS_CACHE = path.join(ROOT, 'assets', 'branding', 'icons-png');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function renderBrandIconPng(size, outPath) {
  const s = size;
  const radius = Math.round(s * 0.22);
  const cx = Math.round(s * 0.5);
  const arrowTop = Math.round(s * 0.23);
  const arrowBottom = Math.round(s * 0.66);
  const shaftW = Math.max(2, Math.round(s * 0.065));
  const wingW = Math.round(s * 0.22);
  const wingY = Math.round(s * 0.46);
  const trayTop = Math.round(s * 0.72);
  const trayBottom = Math.round(s * 0.8);
  const trayPad = Math.round(s * 0.23);
  const cornerStroke = Math.max(1, Math.round(s * 0.03));

  const mvg = [
    `push graphic-context`,
    `viewbox 0 0 ${s} ${s}`,
    `fill "#0F172A"`,
    `roundrectangle 0,0 ${s - 1},${s - 1} ${radius},${radius}`,
    `fill "none"`,
    `stroke "#2563EB"`,
    `stroke-width ${cornerStroke}`,
    `roundrectangle ${cornerStroke},${cornerStroke} ${s - 1 - cornerStroke},${s - 1 - cornerStroke} ${Math.max(2, radius - 1)},${Math.max(2, radius - 1)}`,
    `stroke "none"`,
    `fill "#38BDF8"`,
    `roundrectangle ${cx - shaftW},${arrowTop} ${cx + shaftW},${arrowBottom - Math.round(s * 0.08)} ${Math.max(1, Math.round(shaftW / 2))},${Math.max(1, Math.round(shaftW / 2))}`,
    `polygon ${cx - wingW},${wingY} ${cx + wingW},${wingY} ${cx},${arrowBottom}`,
    `fill "#F8FAFC"`,
    `roundrectangle ${trayPad},${trayTop} ${s - trayPad},${trayBottom} ${Math.max(1, Math.round(s * 0.03))},${Math.max(1, Math.round(s * 0.03))}`,
    `pop graphic-context`,
  ].join('\n');

  const tmpMvg = path.join('/tmp', `novaload-icon-${s}.mvg`);
  fs.writeFileSync(tmpMvg, mvg, 'utf8');
  execFileSync('convert', ['-size', `${s}x${s}`, 'xc:none', '-draw', `@${tmpMvg}`, `PNG32:${outPath}`]);
  fs.rmSync(tmpMvg, { force: true });
}

function buildIcnsFromPngs(entries, outPath) {
  // Official Apple ICNS format: 'icns' + u32be totalSize + chunks(type4 + u32be chunkLen + pngBytes)
  const chunks = [];
  let totalSize = 8;
  for (const { type, pngPath } of entries) {
    const data = fs.readFileSync(pngPath);
    const header = Buffer.alloc(8);
    header.write(type, 0, 4, 'ascii');
    header.writeUInt32BE(8 + data.length, 4);
    chunks.push(header, data);
    totalSize += 8 + data.length;
  }
  const fileHeader = Buffer.alloc(8);
  fileHeader.write('icns', 0, 4, 'ascii');
  fileHeader.writeUInt32BE(totalSize, 4);
  fs.writeFileSync(outPath, Buffer.concat([fileHeader, ...chunks]));
}

ensureDir(TAURI_ICONS_DIR);
ensureDir(EXT_ICONS_CACHE);

const icon16 = path.join(EXT_ICONS_CACHE, 'icon-16.png');
const icon32 = path.join(TAURI_ICONS_DIR, '32x32.png');
const icon48 = path.join(EXT_ICONS_CACHE, 'icon-48.png');
const icon128 = path.join(TAURI_ICONS_DIR, '128x128.png');
const icon256 = path.join(TAURI_ICONS_DIR, '128x128@2x.png');
const icon512 = path.join(EXT_ICONS_CACHE, 'icon-512.png');

renderBrandIconPng(16, icon16);
renderBrandIconPng(32, icon32);
renderBrandIconPng(48, icon48);
renderBrandIconPng(128, icon128);
renderBrandIconPng(256, icon256);
renderBrandIconPng(512, icon512);
fs.copyFileSync(icon128, path.join(EXT_ICONS_CACHE, 'icon-128.png'));

execFileSync('convert', [icon16, icon32, icon48, icon128, icon256, path.join(TAURI_ICONS_DIR, 'icon.ico')]);
buildIcnsFromPngs(
  [
    { type: 'ic07', pngPath: icon128 },
    { type: 'ic08', pngPath: icon256 },
    { type: 'ic09', pngPath: icon512 },
  ],
  path.join(TAURI_ICONS_DIR, 'icon.icns')
);

console.log('Generated Tauri icons (PNG/ICO/ICNS) and extension PNG icons cleanly.');
