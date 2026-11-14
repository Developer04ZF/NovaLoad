# Browser Integration

![Browser Bridge](../../assets/illustrations/browser-bridge.svg)

## Purpose
Hand off links, media elements, and browser downloads directly from Google Chrome, Microsoft Edge, and Mozilla Firefox into NovaLoad's multi-connection engine.

## Minimal Permissions Model
All four dedicated extension bundles (`extensions/brave/`, `extensions/chrome/`, `extensions/edge/`, `extensions/firefox/`) use Manifest V3 and request only three narrow permissions:
- `downloads` — optional interception when **Auto-Intercept** is enabled in the extension popup.
- `contextMenus` — adds **Download with NovaLoad** to link, video, and audio right-click menus.
- `storage` — stores the local endpoint (e.g., `http://127.0.0.1:<port>`) and auth token locally.

Host permission is restricted strictly to `http://127.0.0.1/*` so extensions can communicate with dynamic localhost ports spawned by the desktop app without injecting content scripts into external websites.

## Pairing with NovaLoad
1. Open **Browser Bridge** in NovaLoad (`BrowserBridgeAndPluginsView.tsx`).
2. Ensure the bridge is enabled and copy both the active **Endpoint URL** and **Bridge Auth Token** (`nl_bridge_...`).
3. Download the matching `NovaLoad-<Browser>-Extension-v1.0.0.zip` release archive (or load the unpacked directory under `extensions/{brave,chrome,edge,firefox}/`), open its popup, paste the endpoint and token, and click **Test Connection**.
4. Rotate the token at any time via **Rotate Token** (`POST /api/settings/rotate-bridge-token`).

## Related Documentation
- [Chrome Setup](../integrations/chrome.md)
- [Edge Setup](../integrations/edge.md)
- [Firefox Setup](../integrations/firefox.md)
- [Browser Extensions Distribution](../releases/browser-extensions.md)
