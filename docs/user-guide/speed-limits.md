# Bandwidth & Speed Limits

## Three-Tier Rate Limiting
NovaLoad enforces bandwidth caps cleanly at three levels using `TokenBucketPacer`:
1. **Per-Download Limit (`item.speedLimitKbps`)**: Editable per transfer inside the **Download Details Drawer** (`PATCH /api/downloads/:id`). Overrides queue defaults for that file.
2. **Queue Limit (`queue.speedLimitKbps`)**: Applies when an item has no per-download cap.
3. **Global Speed Limit (`settings.globalSpeedLimitKbps`)**: Shared across all active segments via `DownloadManager.globalPacer`.

## How Per-Connection Fair Pacing Works
When an effective download/queue cap exists (`effectiveDlLimit`), each active connection segment receives `Math.max(8, Math.floor(effectiveDlLimit / Math.max(1, item.connections)))` KB/s before the shared `globalPacer` check runs, preventing socket starvation while respecting total throughput caps.

## Dynamic Adjustment
Because settings, queue limits, and download limits are read from SQLite inside the stream loop, updating a cap takes effect immediately on the next chunk without restarting active transfers.

## Related Documentation
- [Token Bucket Bandwidth Control](../download-engine/bandwidth-control.md)
- [Timed Scheduler](./scheduler.md)
