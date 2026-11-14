# Browser Extension Bridge

## Overview
NovaLoad exposes a local HTTP bridge in `server/app.ts` enabling self-contained Manifest V3 extensions under `extensions/{brave,chrome,edge,firefox}/` (built from `extensions/shared/`) to hand off download targets cleanly.

## Authentication & Request Validation Flow
1. Extension background worker (`background.js`) validates connectivity via `GET /api/bridge/ping` and sends captures via `POST /api/bridge/capture` on the configured localhost endpoint with header `x-novaload-token`.
2. Server verifies `settings.browserBridgeEnabled === true` (returns `403` otherwise).
3. Server validates token equality against `settings.browserBridgeToken` (returns `401` otherwise).
4. Submitted URL passes async DNS + SSRF `validateDownloadUrlWithDns()` checks (blocking non-HTTP(S), embedded credentials, IPv4-mapped IPv6 bypasses, and private/metadata IPs unless `privacyBlockPrivateIps` allows local fixtures).
5. `downloadManager.createDownload()` enqueues the download and logs an entry in `browser_captures`.

## Token Rotation
Tokens (`nl_bridge_<36-hex>`) can be rotated anytime via `POST /api/settings/rotate-bridge-token` and are redacted in `GET /api/bridge/status` (preview only) and `GET /api/database/export`.

## Related Documentation
- [Browser Extensions Overview](../integrations/browser-extensions.md)
- [Security Model](../security/security-model.md)
