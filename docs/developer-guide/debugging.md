# Debugging & Local Fixtures

## Built-in Deterministic Fixtures (`/api/fixtures/*`)
NovaLoad includes a deterministic fixture router (`server/routes/fixtures.ts`) designed for repeatable manual testing and integration tests without external network dependencies:
- Supports deterministic files (such as `/api/fixtures/file/novaload-linux-x64.tar.gz`) with real `Accept-Ranges: bytes`, `ETag`, `Content-Length`, and non-range streaming test routes, plus `/api/fixtures/video/...` variants for testing **Video & Media**.
- SSRF rules block `127.0.0.1` by default, *except* when `validateDownloadUrl` receives `allowLocalFixturesPort` matching NovaLoad's bound port and path prefix `/api/fixtures/`.

## Checking Database & Logs
- Inspect per-download transfer diagnostics inside **Download Details Drawer → Events**.
- Run `curl http://127.0.0.1:3000/api/health` to verify `PRAGMA integrity_check` status.
- Export state cleanly with `GET /api/database/export`.

## Related Documentation
- [Testing & Verification](./testing.md)
- [Error Handling & Diagnostics](../download-engine/error-handling.md)
