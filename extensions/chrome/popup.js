// Licensed under Apache-2.0

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
