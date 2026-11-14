// Licensed under Apache-2.0
// NovaLoad Download Bridge (Chrome) v1.0.0

const extApi = typeof browser !== 'undefined' ? browser : chrome;
const DEFAULT_ENDPOINT = 'http://127.0.0.1:3000/api/bridge/capture';
const BUILD_BROWSER = 'chrome';

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
  if (!url || !/^https?:\/\//i.test(url)) return { ok: false, error: 'Unsupported URL scheme.' };
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
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) return;
  const result = await sendToNovaLoad(targetUrl, downloadItem.filename || null, downloadItem.referrer || null);
  if (result.ok) {
    try {
      await extApi.downloads.cancel(downloadItem.id);
    } catch {
      // ignore if browser already completed tiny transfer
    }
  }
});
