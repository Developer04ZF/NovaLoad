#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Generates self-contained browser extension directories under extensions/{brave,chrome,edge,firefox}
 * and packages deterministic release ZIP archives in dist/extensions/:
 *   - NovaLoad-Brave-Extension-v<version>.zip
 *   - NovaLoad-Chrome-Extension-v<version>.zip
 *   - NovaLoad-Edge-Extension-v<version>.zip
 *   - NovaLoad-Firefox-Extension-v<version>.zip
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;

const EXT_ROOT = path.join(ROOT, 'extensions');
const OUT_ZIP_DIR = path.join(ROOT, 'dist', 'extensions');
const ICON_CACHE_DIR = path.join(ROOT, 'assets', 'branding', 'icons-png');

const BROWSERS = [
  {
    id: 'brave',
    label: 'Brave',
    description: 'Send Brave downloads and media links directly to the NovaLoad desktop download manager.',
    isFirefox: false,
    installUrl: 'brave://extensions',
  },
  {
    id: 'chrome',
    label: 'Chrome',
    description: 'Send Google Chrome downloads and media links directly to the NovaLoad desktop download manager.',
    isFirefox: false,
    installUrl: 'chrome://extensions',
  },
  {
    id: 'edge',
    label: 'Edge',
    description: 'Send Microsoft Edge downloads and media links directly to the NovaLoad desktop download manager.',
    isFirefox: false,
    installUrl: 'edge://extensions',
  },
  {
    id: 'firefox',
    label: 'Firefox',
    description: 'Send Mozilla Firefox downloads and media links directly to the NovaLoad desktop download manager.',
    isFirefox: true,
    installUrl: 'about:debugging#/runtime/this-firefox',
  },
];

function buildManifest(browser) {
  const base = {
    manifest_version: 3,
    name: 'NovaLoad Download Bridge',
    version: VERSION,
    description: browser.description,
    icons: {
      '16': 'icons/icon-16.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
    permissions: ['downloads', 'contextMenus', 'storage'],
    host_permissions: ['http://127.0.0.1/*', 'http://localhost/*'],
    action: {
      default_popup: 'popup.html',
      default_title: `NovaLoad Bridge (${browser.label})`,
      default_icon: {
        '16': 'icons/icon-16.png',
        '48': 'icons/icon-48.png',
        '128': 'icons/icon-128.png',
      },
    },
  };

  if (browser.isFirefox) {
    return {
      ...base,
      browser_specific_settings: {
        gecko: {
          id: 'bridge@novaload.org',
          strict_min_version: '115.0',
        },
      },
      background: {
        scripts: ['background.js'],
      },
    };
  }

  return {
    ...base,
    background: {
      service_worker: 'background.js',
    },
  };
}

function buildBackgroundJs(browser) {
  return `// Licensed under Apache-2.0
// NovaLoad Download Bridge (${browser.label}) v${VERSION}

const extApi = typeof browser !== 'undefined' ? browser : chrome;
const DEFAULT_ENDPOINT = 'http://127.0.0.1:3000/api/bridge/capture';
const BUILD_BROWSER = '${browser.id}';

function registerContextMenu() {
  if (!extApi.contextMenus) return;
  try {
    extApi.contextMenus.removeAll(() => {
      void extApi.runtime?.lastError;
      extApi.contextMenus.create({
        id: 'novaload-download-link',
        title: 'Download with NovaLoad',
        contexts: ['link', 'video', 'audio'],
      });
    });
  } catch {
    // Ignore duplicate menu registration errors
  }
}

extApi.runtime.onInstalled.addListener(() => {
  registerContextMenu();
});

if (extApi.runtime.onStartup) {
  extApi.runtime.onStartup.addListener(() => {
    registerContextMenu();
  });
}

function normalizeEndpoint(raw) {
  const trimmed = (raw || DEFAULT_ENDPOINT).trim();
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return DEFAULT_ENDPOINT;
    if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') return DEFAULT_ENDPOINT;
    return u.toString();
  } catch {
    return DEFAULT_ENDPOINT;
  }
}

function setBadge(text, color) {
  if (!extApi.action?.setBadgeText) return;
  try {
    void extApi.action.setBadgeText({ text });
    if (color && extApi.action.setBadgeBackgroundColor) {
      void extApi.action.setBadgeBackgroundColor({ color });
    }
    if (text) {
      setTimeout(() => {
        try {
          void extApi.action.setBadgeText({ text: '' });
        } catch {
          // ignore
        }
      }, 4000);
    }
  } catch {
    // ignore
  }
}

async function detectBrowserName() {
  if (BUILD_BROWSER === 'brave') return 'brave';
  if (BUILD_BROWSER === 'firefox') return 'firefox';
  if (BUILD_BROWSER === 'edge' || navigator.userAgent.includes('Edg/')) return 'edge';
  try {
    if (navigator.brave && (await navigator.brave.isBrave())) return 'brave';
  } catch {
    // ignore
  }
  return BUILD_BROWSER;
}

async function sendToNovaLoad(url, filename = null, referrer = null) {
  if (!url || !/^https?:\\/\\//i.test(url)) return { ok: false, error: 'Unsupported URL scheme.' };
  const stored = await extApi.storage.local.get(['endpoint', 'token']);
  const endpoint = normalizeEndpoint(stored.endpoint);
  const token = (stored.token || '').trim();
  if (!token) {
    setBadge('KEY', '#dc2626');
    return { ok: false, error: 'Pairing token not configured.' };
  }

  try {
    const browserName = await detectBrowserName();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-novaload-token': token,
      },
      body: JSON.stringify({
        browser: browserName,
        url,
        filename,
        referrer,
      }),
    });
    if (!res.ok) {
      setBadge('ERR', '#dc2626');
      return { ok: false, error: 'NovaLoad rejected request (' + res.status + ')' };
    }
    setBadge('OK', '#16a34a');
    return { ok: true };
  } catch (err) {
    setBadge('OFF', '#d97706');
    return { ok: false, error: err && err.message ? err.message : 'Unable to reach NovaLoad.' };
  }
}

extApi.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'novaload-download-link') {
    const targetUrl = info.linkUrl || info.srcUrl;
    void sendToNovaLoad(targetUrl, null, tab && tab.url ? tab.url : null);
  }
});

extApi.downloads.onCreated.addListener(async (downloadItem) => {
  const stored = await extApi.storage.local.get(['autoIntercept']);
  if (!stored.autoIntercept) return;
  const targetUrl = downloadItem.finalUrl || downloadItem.url;
  if (!targetUrl || !/^https?:\\/\\//i.test(targetUrl)) return;
  const result = await sendToNovaLoad(targetUrl, downloadItem.filename || null, downloadItem.referrer || null);
  if (result.ok) {
    try {
      await extApi.downloads.cancel(downloadItem.id);
    } catch {
      // ignore if browser already completed tiny transfer
    }
  }
});
`;
}

function buildPopupHtml(browser) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>NovaLoad Bridge — ${browser.label}</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; width: 310px; margin: 0; padding: 14px; background: #0b0e14; color: #f1f5f9; }
      .header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
      .header img { width: 20px; height: 20px; border-radius: 5px; }
      h1 { font-size: 14px; margin: 0; font-weight: 700; }
      .badge { margin-left: auto; font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #1e293b; color: #93c5fd; font-weight: 600; }
      label { display: block; font-size: 11px; color: #94a3b8; margin-top: 9px; }
      input[type="text"], input[type="url"] { width: 100%; box-sizing: border-box; padding: 7px 9px; margin-top: 4px; border-radius: 6px; border: 1px solid #232d3f; background: #121722; color: #f1f5f9; font-size: 12px; font-family: ui-monospace, monospace; }
      .checkbox-row { display: flex; align-items: center; gap: 7px; margin-top: 10px; color: #cbd5e1; cursor: pointer; }
      .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
      button { padding: 8px 10px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px; }
      .btn-primary { background: #2563eb; color: #fff; }
      .btn-secondary { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; }
      .status { margin-top: 10px; font-size: 11px; line-height: 1.4; min-height: 16px; }
      .status.ok { color: #4ade80; }
      .status.err { color: #f87171; }
      .hint { margin-top: 8px; font-size: 10px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="header">
      <img src="icons/icon-48.png" alt="NovaLoad" />
      <h1>NovaLoad Bridge</h1>
      <span class="badge">${browser.label}</span>
    </div>
    <label>Local Handoff Endpoint<input id="endpoint" type="url" value="http://127.0.0.1:3000/api/bridge/capture" placeholder="http://127.0.0.1:PORT/api/bridge/capture" /></label>
    <label>Pairing Token (x-novaload-token)<input id="token" type="text" placeholder="nl_bridge_..." /></label>
    <label class="checkbox-row"><input id="autoIntercept" type="checkbox" /> Automatically intercept browser downloads</label>
    <div class="actions">
      <button id="save" class="btn-primary" type="button">Save Settings</button>
      <button id="test" class="btn-secondary" type="button">Test Connection</button>
    </div>
    <div id="status" class="status"></div>
    <div class="hint">Find your desktop port and token inside NovaLoad -> Browser Bridge.</div>
    <script src="popup.js"></script>
  </body>
</html>
`;
}

function buildPopupJs() {
  return `// Licensed under Apache-2.0

const extApi = typeof browser !== 'undefined' ? browser : chrome;

function setStatus(msg, isError) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status ' + (isError ? 'err' : 'ok');
}

function derivePingUrl(captureEndpoint) {
  const parsed = new URL(captureEndpoint.trim());
  if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
    throw new Error('Only localhost / 127.0.0.1 endpoints are permitted.');
  }
  return parsed.origin + '/api/bridge/ping';
}

document.addEventListener('DOMContentLoaded', async () => {
  const endpointEl = document.getElementById('endpoint');
  const tokenEl = document.getElementById('token');
  const autoEl = document.getElementById('autoIntercept');

  const stored = await extApi.storage.local.get(['endpoint', 'token', 'autoIntercept']);
  if (stored.endpoint) endpointEl.value = stored.endpoint;
  if (stored.token) tokenEl.value = stored.token;
  autoEl.checked = Boolean(stored.autoIntercept);

  async function saveConfig() {
    const endpoint = endpointEl.value.trim();
    const token = tokenEl.value.trim();
    await extApi.storage.local.set({
      endpoint,
      token,
      autoIntercept: autoEl.checked,
    });
    return { endpoint, token };
  }

  document.getElementById('save').addEventListener('click', async () => {
    try {
      const { endpoint } = await saveConfig();
      derivePingUrl(endpoint);
      setStatus('Configuration saved locally.', false);
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  document.getElementById('test').addEventListener('click', async () => {
    try {
      const { endpoint, token } = await saveConfig();
      const pingUrl = derivePingUrl(endpoint);
      if (!token) {
        setStatus('Enter your nl_bridge_... pairing token first.', true);
        return;
      }
      setStatus('Testing connection to NovaLoad...', false);
      const res = await fetch(pingUrl, {
        method: 'GET',
        headers: { 'x-novaload-token': token },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data.error || 'Connection failed (HTTP ' + res.status + ')', true);
        return;
      }
      setStatus('Connected to NovaLoad v' + (data.version || '1.0.0') + ' (Bridge Active)', false);
    } catch (err) {
      setStatus('Could not reach NovaLoad desktop backend: ' + err.message, true);
    }
  });
});
`;
}

function buildBrowserReadme(browser) {
  if (browser.isFirefox) {
    return `# NovaLoad Browser Extension — Mozilla Firefox (v${VERSION})

## Package Contents
Self-contained Firefox Manifest V3 WebExtension (\`manifest.json\`, \`background.js\`, \`popup.html\`, \`popup.js\`, \`icons/\`).

## Temporary Unpacked Installation (Development / Immediate Use)
1. Launch NovaLoad Desktop (or local server) and open **Browser Bridge** to copy your **Handoff Endpoint** and **Pairing Token** (\`nl_bridge_...\`).
2. Open \`${browser.installUrl}\` in Firefox.
3. Click **Load Temporary Add-on...**.
4. Select \`manifest.json\` inside the extracted folder (or select the \`.zip\` archive directly).
5. Click the NovaLoad toolbar icon, paste your Endpoint + Token, and click **Test Connection**.

> **Firefox Signing Note**: Unlisted/temporary unsigned XPI/ZIP bundles are accepted via \`about:debugging\` (or Firefox Developer Edition / Nightly with \`xpinstall.signatures.required=false\`). Permanent standard Firefox release installation requires signed distribution through Mozilla Add-ons (AMO).
`;
  }

  return `# NovaLoad Browser Extension — ${browser.label} (v${VERSION})

## Package Contents
Self-contained ${browser.label} Manifest V3 extension (\`manifest.json\`, \`background.js\`, \`popup.html\`, \`popup.js\`, \`icons/\`).

## Unpacked Installation (${browser.label})
1. Extract \`NovaLoad-${browser.label}-Extension-v${VERSION}.zip\` to a permanent folder.
2. Launch NovaLoad Desktop (or local server) and open **Browser Bridge** to copy your **Handoff Endpoint** and **Pairing Token** (\`nl_bridge_...\`).
3. Open \`${browser.installUrl}\` in ${browser.label}.
4. Enable **Developer mode** in the top-right corner.
5. Click **Load unpacked** and select the extracted folder containing \`manifest.json\`.
6. Pin **NovaLoad Download Bridge** to your toolbar, paste your Endpoint + Token, and click **Test Connection**.
`;
}

// Pure Node deterministic PKZIP builder (no external `zip` binary or Python dependency required)
function writeZipArchive(sourceDir, outZipPath) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        files.push({
          relPath: path.relative(sourceDir, full).replace(/\\/g, '/'),
          data: fs.readFileSync(full),
        });
      }
    }
  }
  walk(sourceDir);

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  // Deterministic DOS timestamp (2026-11-13 00:00:00)
  const dosTime = 0;
  const dosDate = ((2026 - 1980) << 9) | (11 << 5) | 13;

  for (const file of files) {
    const nameBuf = Buffer.from(file.relPath, 'utf8');
    const crc = zlib.crc32(file.data) >>> 0;
    const compressed = zlib.deflateRawSync(file.data, { level: 9 });
    const useDeflate = compressed.length < file.data.length;
    const method = useDeflate ? 8 : 0;
    const payload = useDeflate ? compressed : file.data;

    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4); // version needed
    lfh.writeUInt16LE(0x0800, 6); // UTF-8
    lfh.writeUInt16LE(method, 8);
    lfh.writeUInt16LE(dosTime, 10);
    lfh.writeUInt16LE(dosDate, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(payload.length, 18);
    lfh.writeUInt32LE(file.data.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);

    localParts.push(lfh, nameBuf, payload);

    const cdfh = Buffer.alloc(46);
    cdfh.writeUInt32LE(0x02014b50, 0);
    cdfh.writeUInt16LE(20, 4);
    cdfh.writeUInt16LE(20, 6);
    cdfh.writeUInt16LE(0x0800, 8);
    cdfh.writeUInt16LE(method, 10);
    cdfh.writeUInt16LE(dosTime, 12);
    cdfh.writeUInt16LE(dosDate, 14);
    cdfh.writeUInt32LE(crc, 16);
    cdfh.writeUInt32LE(payload.length, 20);
    cdfh.writeUInt32LE(file.data.length, 24);
    cdfh.writeUInt16LE(nameBuf.length, 28);
    cdfh.writeUInt16LE(0, 30);
    cdfh.writeUInt16LE(0, 32);
    cdfh.writeUInt16LE(0, 34);
    cdfh.writeUInt16LE(0, 36);
    cdfh.writeUInt32LE(0, 38);
    cdfh.writeUInt32LE(offset, 42);

    centralParts.push(cdfh, nameBuf);
    offset += lfh.length + nameBuf.length + payload.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  fs.mkdirSync(path.dirname(outZipPath), { recursive: true });
  fs.writeFileSync(outZipPath, Buffer.concat([...localParts, centralDirBuf, eocd]));
}

// Verify icon cache exists
for (const iconName of ['icon-16.png', 'icon-48.png', 'icon-128.png']) {
  if (!fs.existsSync(path.join(ICON_CACHE_DIR, iconName))) {
    throw new Error(`Missing cached extension icon: assets/branding/icons-png/${iconName}. Run node scripts/generate-icons.mjs first.`);
  }
}

fs.mkdirSync(OUT_ZIP_DIR, { recursive: true });

for (const b of BROWSERS) {
  const dir = path.join(EXT_ROOT, b.id);
  const iconsDir = path.join(dir, 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });

  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(buildManifest(b), null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'background.js'), buildBackgroundJs(b));
  fs.writeFileSync(path.join(dir, 'popup.html'), buildPopupHtml(b));
  fs.writeFileSync(path.join(dir, 'popup.js'), buildPopupJs());
  fs.writeFileSync(path.join(dir, 'README.md'), buildBrowserReadme(b));

  for (const iconName of ['icon-16.png', 'icon-48.png', 'icon-128.png']) {
    fs.copyFileSync(path.join(ICON_CACHE_DIR, iconName), path.join(iconsDir, iconName));
  }

  const zipName = `NovaLoad-${b.label}-Extension-v${VERSION}.zip`;
  const zipPath = path.join(OUT_ZIP_DIR, zipName);
  writeZipArchive(dir, zipPath);
  const stat = fs.statSync(zipPath);
  console.log(`Built ${zipName} (${(stat.size / 1024).toFixed(1)} KiB)`);
}
