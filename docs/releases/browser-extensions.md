# Browser Extensions Release Guide

NovaLoad ships four self-contained Manifest V3 browser extensions tailored for **Brave**, **Google Chrome**, **Microsoft Edge**, and **Mozilla Firefox**. Each release provides downloadable ZIP archives alongside unpackaged source directories under `extensions/`.

## Release Archives
Download the matching archive from [GitHub Releases](https://github.com/Developer04ZF/NovaLoad/releases):
- `NovaLoad-Brave-Extension-v1.0.0.zip`
- `NovaLoad-Chrome-Extension-v1.0.0.zip`
- `NovaLoad-Edge-Extension-v1.0.0.zip`
- `NovaLoad-Firefox-Extension-v1.0.0.zip`

## Installing from a Release ZIP

### Google Chrome, Brave & Microsoft Edge
1. Download and extract the ZIP for your browser into a permanent folder (e.g., `~/NovaLoad/extensions/chrome`).
2. Open your browser's extension page:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder (which contains `manifest.json`, `background.js`, `popup.html`, `popup.js`, and `icons/`).
5. Open the NovaLoad desktop app → **System → Browser Bridge** and copy:
   - **Endpoint URL** (for dynamic desktop ports, e.g. `http://127.0.0.1:54321`, or `http://127.0.0.1:3000` in server mode)
   - **Bridge Auth Token** (`nl_bridge_...`)
6. Click the **NovaLoad** toolbar icon, paste the endpoint and token, click **Save Settings**, and verify connectivity with **Test Connection**.

### Mozilla Firefox (`>= 115.0`)
- **Temporary testing**: Extract `NovaLoad-Firefox-Extension-v1.0.0.zip`, open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on...**, and choose `manifest.json`.
- **Permanent unsigned testing**: Use Firefox Developer Edition or Nightly with `xpinstall.signatures.required = false`, or wait for signed `.xpi` distribution via Mozilla AMO (see [Code Signing](./code-signing.md)).

## Security Boundaries
- Host access is strictly limited to `http://127.0.0.1/*` (required to reach dynamically assigned localhost desktop ports without exposing any external origin).
- `desktop localApiToken` (`X-NovaLoad-Local-Token`) and `browserBridgeToken` (`x-novaload-token`) are cryptographically separated: browser extensions can only ping the bridge (`/api/bridge/ping`) or enqueue vetted HTTP/HTTPS URLs (`/api/bridge/capture`), never read settings or delete files.

## Related Documentation
- [Browser Extensions Overview](../integrations/browser-extensions.md)
- [Browser Bridge Architecture](../architecture/browser-bridge.md)
