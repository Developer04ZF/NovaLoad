# Token Bucket Bandwidth Control

## `TokenBucketPacer` Algorithm (`server/engine/downloadManager.ts`)
Each `TokenBucketPacer` maintains two scalar fields:
- `lastCheck`: High-resolution millisecond timestamp
- `allowanceBytes`: Accumulated credit capped at `rateBps = limitKbps * 1024` (1-second burst ceiling)

On each streamed chunk of size `bytes`:
1. Replenishes `allowanceBytes = Math.min(rateBps, allowanceBytes + elapsedSec * rateBps)`.
2. Subtracts `bytes` from `allowanceBytes`.
3. If `allowanceBytes < 0`, calculates `waitMs = Math.min(1500, Math.ceil((-allowanceBytes / rateBps) * 1000))` and pauses reading from that stream (`setTimeout`) before continuing.

## Precedence & Composition
- Per-download `speedLimitKbps` takes precedence over queue `queue.speedLimitKbps` (`item.speedLimitKbps ?? queue?.speedLimitKbps ?? null`), divided evenly across `item.connections` (floored to `>= 8 KB/s` per segment).
- Afterward, every chunk also checks `this.globalPacer` if `settings.globalSpeedLimitKbps` is set.

## Related Documentation
- [Speed Limits User Guide](../user-guide/speed-limits.md)
- [Priority Queues](../user-guide/queues.md)
