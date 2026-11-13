# Download Engine Internals

## Class Overview (`server/engine/downloadManager.ts`)
`DownloadManager` extends `EventEmitter` and coordinates:
- `activeJobs: Map<string, ActiveJobRuntime>` tracking active `AbortController` instances, pause/cancel flags, and per-segment throughput measurements.
- `globalPacer: TokenBucketPacer` enforcing global bandwidth limits (`settings.globalSpeedLimitKbps`).
- Background telemetry loop (`1000 ms`) appending `BandwidthPoint` entries (trailing 60 samples) and emitting `snapshot` events.
- Background scheduler/dispatcher loop (`5000 ms`) running `evaluateSchedules()` and `dispatchQueuedDownloads()`.

## Segment Execution Flow
1. Preallocates or opens `<filePath>.part`.
2. Creates `1..16` `DownloadSegment` rows if `supportsRanges && totalBytes >= 65536`; otherwise creates 1 segment (`0..-1` or `0..totalBytes-1`).
3. Spawns `Promise.all(segments.map(runSegment))` issuing HTTP `Range: bytes=<startPos>-<endByte>` + `If-Range: <etag>` headers.
4. Writes streamed chunks directly to `seg.startByte + bytesWritten` using `FileHandle.write()`.
5. Flushes `downloaded_bytes` to SQLite every `>= 350 ms` and aggregates progress + ETA.
6. Verifies size and SHA-256 / SHA-512 digests, then atomically renames `<filePath>.part` to `filePath`.

## Related Documentation
- [Download Engine Overview](../download-engine/overview.md)
- [SQLite Database Schema](./database.md)
