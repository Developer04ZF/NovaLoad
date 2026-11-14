#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Builds the standalone Node 22 Single Executable Application (SEA) backend sidecar
 * placed in src-tauri/binaries/novaload-server-<target-triple>[.exe].
 */

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const BUILD_DIR = path.join(ROOT, 'build');
const BINARIES_DIR = path.join(ROOT, 'src-tauri', 'binaries');
const SENTINEL_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

function detectHostTarget() {
  const { platform, arch } = process;
  if (platform === 'win32') {
    return arch === 'arm64' ? 'aarch64-pc-windows-msvc' : 'x86_64-pc-windows-msvc';
  }
  if (platform === 'darwin') {
    return arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin';
  }
  return arch === 'arm64' ? 'aarch64-unknown-linux-gnu' : 'x86_64-unknown-linux-gnu';
}

function parseTargetArg() {
  const idx = process.argv.indexOf('--target');
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return process.env.TAURI_TARGET || detectHostTarget();
}

async function resolveNodeBinaryForTarget(targetTriple, hostTriple) {
  if (targetTriple === hostTriple) {
    return process.execPath;
  }

  // Cross-target support (primarily Windows x64 runner building win-arm64 sidecar)
  const ver = process.version; // e.g. v22.23.2
  const zipMap = {
    'aarch64-pc-windows-msvc': `node-${ver}-win-arm64.zip`,
    'x86_64-pc-windows-msvc': `node-${ver}-win-x64.zip`,
  };
  const archiveName = zipMap[targetTriple];
  if (!archiveName) {
    throw new Error(
      `Cross-compiling SEA from ${hostTriple} to ${targetTriple} requires running on a matching OS runner.`
    );
  }

  const cacheDir = path.join(BUILD_DIR, 'node-cache', targetTriple);
  const extractedExe = path.join(cacheDir, archiveName.replace(/\.zip$/, ''), 'node.exe');
  if (fs.existsSync(extractedExe)) {
    return extractedExe;
  }

  fs.mkdirSync(cacheDir, { recursive: true });
  const shasumUrl = `https://nodejs.org/dist/${ver}/SHASUMS256.txt`;
  const archiveUrl = `https://nodejs.org/dist/${ver}/${archiveName}`;

  console.log(`Downloading official Node ${ver} binary for ${targetTriple} (${archiveName})...`);
  const shasumText = await (await fetch(shasumUrl)).text();
  const expectedLine = shasumText.split(/\r?\n/).find((l) => l.endsWith(`  ${archiveName}`));
  if (!expectedLine) {
    throw new Error(`Could not locate ${archiveName} in ${shasumUrl}`);
  }
  const expectedHash = expectedLine.split(/\s+/)[0];

  const archiveBuf = Buffer.from(await (await fetch(archiveUrl)).arrayBuffer());
  const actualHash = crypto.createHash('sha256').update(archiveBuf).digest('hex');
  if (actualHash !== expectedHash) {
    throw new Error(`SHA-256 verification failed for ${archiveName}: expected ${expectedHash}, got ${actualHash}`);
  }

  const archivePath = path.join(cacheDir, archiveName);
  fs.writeFileSync(archivePath, archiveBuf);
  if (process.platform === 'win32') {
    execFileSync('powershell', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -Force -Path '${archivePath}' -DestinationPath '${cacheDir}'`,
    ]);
  } else {
    execFileSync('unzip', ['-q', '-o', archivePath, '-d', cacheDir]);
  }
  return extractedExe;
}

async function main() {
  const hostTriple = detectHostTarget();
  const targetTriple = parseTargetArg();
  const isWindowsTarget = targetTriple.includes('windows');
  const isMacTarget = targetTriple.includes('apple-darwin');

  // 1. Build bundled CJS backend
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-server.mjs')], {
    stdio: 'inherit',
  });

  // 2. Generate SEA preparation blob
  const seaConfigPath = path.join(BUILD_DIR, 'sea-config.json');
  const seaBlobPath = path.join(BUILD_DIR, 'novaload-sea.blob');
  fs.writeFileSync(
    seaConfigPath,
    JSON.stringify(
      {
        main: path.join(BUILD_DIR, 'server.cjs'),
        output: seaBlobPath,
        disableExperimentalSEAWarning: true,
        useSnapshot: false,
        useCodeCache: false,
      },
      null,
      2
    )
  );
  execFileSync(process.execPath, ['--experimental-sea-config', seaConfigPath], {
    stdio: 'inherit',
  });

  // 3. Copy Node base executable & inject SEA blob via postject
  fs.mkdirSync(BINARIES_DIR, { recursive: true });
  const outBinary = path.join(
    BINARIES_DIR,
    `novaload-server-${targetTriple}${isWindowsTarget ? '.exe' : ''}`
  );
  const nodeBasePath = await resolveNodeBinaryForTarget(targetTriple, hostTriple);
  fs.copyFileSync(nodeBasePath, outBinary);

  if (isMacTarget && process.platform === 'darwin') {
    execFileSync('codesign', ['--remove-signature', outBinary], { stdio: 'inherit' });
  }

  const require = createRequire(import.meta.url);
  const postjectPkg = require.resolve('postject/dist/cli.js');
  const postjectArgs = [
    postjectPkg,
    outBinary,
    'NODE_SEA_BLOB',
    seaBlobPath,
    '--sentinel-fuse',
    SENTINEL_FUSE,
    ...(isMacTarget ? ['--macho-segment-name', 'NODE_SEA'] : []),
  ];
  execFileSync(process.execPath, postjectArgs, { stdio: 'inherit' });

  if (!isWindowsTarget) {
    fs.chmodSync(outBinary, 0o755);
  }
  if (isMacTarget && process.platform === 'darwin') {
    execFileSync('codesign', ['--sign', '-', outBinary], { stdio: 'inherit' });
  }

  const stat = fs.statSync(outBinary);
  console.log(
    `Built NovaLoad desktop sidecar: ${path.relative(ROOT, outBinary)} (${(stat.size / (1024 * 1024)).toFixed(1)} MiB)`
  );
}

main().catch((err) => {
  console.error('Sidecar build failed:', err);
  process.exit(1);
});
