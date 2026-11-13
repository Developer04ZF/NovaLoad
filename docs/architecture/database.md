# SQLite Database Schema & WAL Mode

## Engine & Pragmas (`server/db.ts`)
NovaLoad uses Node.js built-in `node:sqlite` (`DatabaseSync`) stored at `<NOVALOAD_DATA_DIR>/novaload.db` with zero native C++ addon compilation:
- `PRAGMA journal_mode = WAL;` (concurrent reads alongside segment writes)
- `PRAGMA foreign_keys = ON;` (cascade segment/event cleanup when deleting a download)
- `PRAGMA integrity_check;` exposed through `GET /api/health`

## Tables (Schema Version 2)
1. `schema_migrations`: Tracks applied migration versions (`1: initial_schema`, `2: indexes_and_browser_captures`).
2. `queues`: Queue definitions, concurrency caps, default connection counts, speed limits.
3. `categories`: Extension-to-subfolder mapping rules and UI color tokens.
4. `downloads`: Master transfer state, URLs, resolved paths, byte counters, checksums, retry counts.
5. `download_segments`: Byte range (`start_byte`, `end_byte`), `downloaded_bytes`, status, and segment speed.
6. `download_events`: Timestamped audit log (`info`, `warn`, `error`, `success`).
7. `schedules`: Timed queue/throttle automation rules.
8. `settings`: JSON-serialized `AppSettings` under `key = 'app_settings'`.
9. `ai_history`: Logged prompts, models, answers, and proposed action counts.
10. `plugins`: Registered core capabilities (`core-http-range`, `core-media-probe`, `core-sha-verifier`, `core-gemini-assistant`, `core-browser-bridge`).
11. `browser_captures`: Audit trail of URLs handed off from Chrome, Edge, or Firefox extensions.

## Startup Crash Recovery
Upon database construction, any rows left in `'downloading'`, `'probing'`, or `'verifying'` reset cleanly to `'paused'` (`speed_bps = 0`) so interrupted transfers can resume without phantom active locks.

## Related Documentation
- [Database Migrations](../developer-guide/database-migrations.md)
- [Pause & Resume Mechanism](../download-engine/resume-mechanism.md)
