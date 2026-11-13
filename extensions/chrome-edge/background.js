// Licensed under Apache-2.0

const DEFAULT_ENDPOINT = 'http://127.0.0.1:3000/api/bridge/capture';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'novaload-download-link',
    title: 'Download with NovaLoad',
    contexts: ['link', 'video', 'audio'],
  });
});

async function sendToNovaLoad(url, filename = null, referrer = null) {
  if (!url || !/^https?:\/\//i.test(url)) return;
  const { endpoint = DEFAULT_ENDPOINT, token = '' } = await chrome.storage.local.get(['endpoint', 'token']);
  if (!token) return;

  await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-novaload-token': token,
    },
    body: JSON.stringify({
      browser: navigator.userAgent.includes('Edg/') ? 'edge' : 'chrome',
      url,
      filename,
      referrer,
    }),
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'novaload-download-link') {
    const targetUrl = info.linkUrl || info.srcUrl;
    void sendToNovaLoad(targetUrl, null, tab?.url || null);
  }
});

chrome.downloads.onCreated.addListener(async (downloadItem) => {
  const { autoIntercept = false } = await chrome.storage.local.get(['autoIntercept']);
  if (!autoIntercept || !downloadItem.finalUrl) return;
  if (/^https?:\/\//i.test(downloadItem.finalUrl)) {
    chrome.downloads.cancel(downloadItem.id);
    void sendToNovaLoad(downloadItem.finalUrl, downloadItem.filename || null, downloadItem.referrer || null);
  }
});
