# Browser Extensions Overview

![Browser Bridge](../../assets/illustrations/browser-bridge.svg)

## Architecture
NovaLoad builds four self-contained Manifest V3 WebExtension directories from `extensions/shared/` via `npm run build:extensions`:
- `extensions/brave/` — Brave (`NovaLoad-Brave-Extension-v1.0.0.zip`)
- `extensions/chrome/` — Google Chrome (`NovaLoad-Chrome-Extension-v1.0.0.zip`)
- `extensions/edge/` — Microsoft Edge (`NovaLoad-Edge-Extension-v1.0.0.zip`)
- `extensions/firefox/` — Mozilla Firefox (`NovaLoad-Firefox-Extension-v1.0.0.zip`, Gecko ID `bridge@novaload.org`, `strict_min_version: 115.0`)

Each folder contains its own `manifest.json`, `background.js`, `popup.html`, `popup.js`, `README.md`, and extension `icons/` with zero relative `../` imports.

## Requested Permissions
All manifests request the minimum permissions needed to hand off URLs safely:
- `downloads` — optional automatic download interception when **Auto-Intercept** is enabled by the user.
- `contextMenus` — adds **Download with NovaLoad** to right-click menus on `link`, `video`, and `audio` targets.
- `storage` — saves the bridge endpoint and `x-novaload-token` inside extension local storage.
- `host_permissions`: restricted strictly to `http://127.0.0.1/*` (supports dynamic desktop localhost ports).

## Verification
1. Open the extension popup and click **Test Connection** (`GET /api/bridge/ping`).
2. Or inspect bridge logs in NovaLoad's **Browser Bridge** view (`GET /api/bridge/status`).

## Related Documentation
- [Browser Extensions Release Guide](../releases/browser-extensions.md)
- [Google Chrome Setup](./chrome.md)
- [Microsoft Edge Setup](./edge.md)
- [Mozilla Firefox Setup](./firefox.md)
- [Browser Extension Bridge Architecture](../architecture/browser-bridge.md)
