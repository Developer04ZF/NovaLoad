# Browser Extension Bridge

## Overview
NovaLoad exposes a local HTTP bridge in `server/app.ts` enabling Manifest V3 extensions under `extensions/chrome-edge` and `extensions/firefox` to hand off download targets cleanly.

## Authentication & Request Validation Flow
1. Extension background worker (`extensions/chrome-edge/background.js`) sends `POST http://127.0.0.1:3000/api/bridge/capture` with header `x-novaload-token`.
2. Server verifies `settings.browserBridgeEnabled === true` (returns `403` otherwise).
3. Server validates token equality against `settings.browserBridgeToken` (returns `401` otherwise).
4. Submitted URL passes `validateDownloadUrl()` (blocks non-HTTP(S), embedded credentials, and private/metadata IPs unless `privacyBlockPrivateIps` allows local fixtures).
5. `downloadManager.createDownload()` enqueues the download and logs an entry in `browser_captures`.

## Token Rotation
Tokens (`nl_bridge_<36-hex>`) can be rotated anytime via `POST /api/settings/rotate-bridge-token` and are redacted in `GET /api/bridge/status` (preview only) and `GET /api/database/export`.

## Related Documentation
- [Browser Extensions Overview](../integrations/browser-extensions.md)
- [Security Model](../security/security-model.md)
