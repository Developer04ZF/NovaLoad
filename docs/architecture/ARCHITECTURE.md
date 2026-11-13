# NovaLoad Architecture & Download Engine

## 1. System Overview

NovaLoad separates UI presentation (`src/`), API transport (`server/app.ts`), transfer execution (`server/engine/downloadManager.ts`), SQLite persistence (`server/db.ts`), security guards (`server/security.ts`), and native desktop integration (`src-tauri/`).

## 2. Multi-Connection Download Engine

1. **Metadata Probe**: Sends `HEAD` (falling back to `GET Range: bytes=0-0` on HTTP 405/501) and follows up to 5 redirects while re-validating each target URL against SSRF rules.
2. **Segmentation**: When `Accept-Ranges: bytes` is advertised and `Content-Length >= 65536`, bytes `[0..N-1]` are partitioned into `1..16` non-overlapping `DownloadSegment` ranges.
3. **Bounded-Memory Offset Writes**: Each segment streams chunks via `ReadableStreamDefaultReader` directly into its exact byte offset inside `<filePath>.part` using `FileHandle.write(chunk, 0, chunk.length, writeOffset)`.
4. **Range Fallback**: If a server lacks Range support or responds with HTTP `200` on a Range request, the engine safely executes a single sequential stream without data corruption.
5. **Rate Limiting**: Per-download and global `TokenBucketPacer` instances throttle throughput without starving active sockets.
6. **Integrity Verification**: Completed `.part` files stream through `crypto.createHash('sha256')` and `crypto.createHash('sha512')`, check size parity and optional expected checksums, and rename atomically.

## 3. SQLite Database

Versioned migrations in `server/db.ts` (`schema_migrations`) manage `queues`, `categories`, `downloads`, `download_segments`, `download_events`, `schedules`, `settings`, `ai_history`, `browser_captures`, and `plugins` in WAL mode. On startup, any transfers interrupted mid-flight transition cleanly to `paused` with preserved byte offsets.

## 4. Companion CLI & Plugin Architecture

- `cli/novaload.ts` interacts with the live engine API (`download`, `list`, `pause`, `resume`, `cancel`, `queue`, `version`).
- Built-in capabilities are registered in `plugins` with explicit permission scopes (`network:http`, `fs:write-downloads`, `ai:metadata-read`).
