// Licensed under Apache-2.0

document.addEventListener('DOMContentLoaded', async () => {
  const endpointEl = document.getElementById('endpoint');
  const tokenEl = document.getElementById('token');
  const autoEl = document.getElementById('autoIntercept');
  const statusEl = document.getElementById('status');

  const stored = await chrome.storage.local.get(['endpoint', 'token', 'autoIntercept']);
  if (stored.endpoint) endpointEl.value = stored.endpoint;
  if (stored.token) tokenEl.value = stored.token;
  autoEl.checked = Boolean(stored.autoIntercept);

  document.getElementById('save').addEventListener('click', async () => {
    await chrome.storage.local.set({
      endpoint: endpointEl.value.trim(),
      token: tokenEl.value.trim(),
      autoIntercept: autoEl.checked,
    });
    statusEl.textContent = 'Configuration saved.';
  });
});
