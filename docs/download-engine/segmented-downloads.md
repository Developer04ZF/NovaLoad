# Segmented Downloads

## Range Partitioning (`buildInitialSegments`)
Given `totalBytes` and `connections` (`1..16`, clamped by `Math.max(1, Math.min(16, ...))`):
- `chunkSize = Math.floor(totalBytes / connections)`
- Segment `i` owns inclusive byte interval `[i * chunkSize, (i === connections - 1) ? totalBytes - 1 : (i + 1) * chunkSize - 1]`.
- Exact matching Rust partitioning logic exists in `src-tauri/src/engine.rs` (`split_segments`).

## Parallel Disk Writing Without Memory Bloat
1. Before streaming starts, `<filePath>.part` is opened (`w+` / `r+`) and truncated to `totalBytes`.
2. Each segment worker reads streaming `Uint8Array` chunks via `response.body.getReader()`.
3. Each chunk is bounded to `expectedLen - bytesWritten` and written directly at `seg.startByte + bytesWritten` using `fileHandle.write(chunkToWrite, 0, chunkToWrite.length, writeOffset)`.
4. If an origin ignores `Range` during execution and replies HTTP `200 OK` on `seg.segmentIndex > 0`, secondary segments cancel immediately so segment `0` completes safely in single-stream mode.

## Related Documentation
- [Pause & Resume Mechanism](./resume-mechanism.md)
- [Token Bucket Bandwidth Control](./bandwidth-control.md)
