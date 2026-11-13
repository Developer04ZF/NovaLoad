# Pause & Resume Mechanism

## Checkpointed Byte Offsets
During active streaming, `runSegment()` flushes `downloaded_bytes` per segment into SQLite (`download_segments`) roughly every `350 ms` and whenever a stream pauses (`runtime.paused = true`).

## What Happens on Pause
1. All `AbortController` handles for the transfer abort immediately.
2. Active segment streams flush `bytesWritten` and transition from `'active'` to `'paused'`.
3. File descriptors close cleanly (`fileHandle.sync()`, `fileHandle.close()`).
4. Master record transitions to `'paused'` (`speedBps = 0`), freeing a queue concurrency slot for the next queued item.

## What Happens on Resume
- **Range-Capable Origin (`supportsRanges === true`)**: Each unfinished segment calculates `startPos = seg.startByte + seg.downloadedBytes` and sends `Range: bytes=<startPos>-<seg.endByte>` plus `If-Range: <etag>` if an `ETag` was stored during probing.
- **Non-Range Origin (`supportsRanges === false`)**: If partial bytes were written before interruption, NovaLoad truncates `.part` to `0`, resets segment progress to `0`, logs a `'warn'` event (`Server lacks Range support; restarting stream from byte 0.`), and downloads cleanly without corrupted appends.

## Related Documentation
- [Segmented Downloads](./segmented-downloads.md)
- [SQLite Database Schema](../architecture/database.md)
