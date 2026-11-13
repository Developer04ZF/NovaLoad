# REST & SSE API Reference

All endpoints are served from Express (`server/app.ts`) on `http://127.0.0.1:3000` (configurable via `PORT`).

## Health & Telemetry
- `GET /api/health` — Returns engine version (`1.0.0`) and SQLite `PRAGMA integrity_check`.
- `GET /api/snapshot` — Returns complete `DashboardSnapshot` (downloads, queues, categories, schedules, settings, bandwidthHistory, stats).
- `GET /api/events` — Server-Sent Events stream emitting `event: snapshot` JSON payloads and `: keepalive` heartbeats.

## Downloads
- `POST /api/downloads/probe` — Probes URL metadata (`{ url }`) with SSRF validation.
- `GET /api/downloads` — Lists all downloads with segments and events.
- `GET /api/downloads/:id` — Returns a single download with segments and events.
- `POST /api/downloads` — Creates and optionally starts a download (Zod-validated `url`, `filename`, `category`, `queueId`, `connections` 1..16, `speedLimitKbps`, `expectedChecksum`, `expectedChecksumAlgo`, `startImmediately`, `priority`, `mediaFormat`, `mediaQuality`).
- `POST /api/downloads/batch` — Batch creates up to 50 URLs (`{ urls, queueId, startImmediately }`).
- `POST /api/downloads/:id/start` — Starts or resumes a queued/paused download.
- `POST /api/downloads/:id/pause` — Pauses active streams preserving byte offsets.
- `POST /api/downloads/:id/cancel` — Cancels download and deletes `.part` file.
- `POST /api/downloads/:id/retry` — Clears `.part` and restarts segments from byte `0`.
- `PATCH /api/downloads/:id` — Updates `priority`, `queueId`, `category`, or `speedLimitKbps`.
- `DELETE /api/downloads/:id` — Cancels and deletes DB row (optional `?deleteFile=true` removes finished file).
- `POST /api/downloads/actions/pause-all` / `POST /api/downloads/actions/resume-all`
- `POST /api/downloads/:id/verify` — Computes/verifies SHA-256 and SHA-512 on disk.

## Queues, Categories, Schedules & Settings
- `GET /api/queues`, `POST /api/queues`, `POST /api/queues/reorder`
- `GET /api/categories`, `POST /api/categories`
- `GET /api/schedules`, `POST /api/schedules`, `DELETE /api/schedules/:id`
- `GET /api/settings`, `PUT /api/settings`, `POST /api/settings/rotate-bridge-token`
- `GET /api/database/export` — Exports redacted JSON snapshot.

## Media, File Manager, Gemini AI, Bridge & Plugins
- `POST /api/media/probe`
- `GET /api/files/inventory`, `POST /api/files/execute-actions`
- `GET /api/ai/status`, `POST /api/ai/test`, `POST /api/ai/analyze`, `GET /api/ai/history`, `DELETE /api/ai/history`
- `GET /api/bridge/status`, `POST /api/bridge/capture` (requires `x-novaload-token`)
- `GET /api/plugins`, `POST /api/plugins/:id/toggle`

## Related Documentation
- [API & CLI Integration](../integrations/api-configuration.md)
- [Express Backend Architecture](../architecture/backend.md)
