# Configuration & Environment Setup

## Purpose
Understand how NovaLoad separates server environment configuration from persisted SQLite user settings.

## Environment Variables
Create a local `.env` from `.env.example` (never commit `.env` to Git):

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP port bound by Express (`server.ts`). |
| `NODE_ENV` | `development` | When `production`, serves compiled static assets from `dist/` instead of Vite dev middleware. |
| `NOVALOAD_DATA_DIR` | `./.novaload` | Directory storing `novaload.db` and `downloads/`. |
| `GEMINI_API_KEY` | Unset (`MY_GEMINI_API_KEY` placeholder) | Server-only API key for optional `@google/genai` file assistant routes. |
| `APP_URL` | Unset | Public/deployment URL metadata if hosted behind a proxy. |
| `NOVALOAD_API_URL` | `http://127.0.0.1:3000` | Target API base URL read by `cli/novaload.ts`. |

## Persisted Runtime Settings (`settings` Table)
Application preferences are stored in SQLite (`settings` table under `app_settings`) and editable from the **Settings** view or `PUT /api/settings`:
- **Theme & Locale**: `theme` (`dark`, `light`, `system`), `locale` (`en`, `fa`, `ar`).
- **Transfer Defaults**: `defaultConnections` (`6`), `maxGlobalConcurrent` (`4`), `globalSpeedLimitKbps` (`null`), `autoCategorize` (`true`), `verifyChecksumOnComplete` (`true`), `autoRetry` (`true`), `maxRetries` (`3`).
- **Privacy & SSRF**: `privacyBlockPrivateIps` (`true`).
- **Browser Bridge**: `browserBridgeEnabled` (`true`), `browserBridgeToken` (auto-generated `nl_bridge_<36-hex>`).
- **Optional Gemini AI**: `aiEnabled` (`true`), `aiModel` (`gemini-4-hydrogen` or `gemini-3.1-flash-lite`), `aiRequireConfirmation` (`true`), `aiAllowFileMetadata` (`true`), `aiAllowFileContent` (`false`).

## Related Documentation
- [Environment Variables Reference](../reference/environment-variables.md)
- [Secrets Management](../security/secrets-management.md)
- [Settings User Guide](../user-guide/settings.md)
