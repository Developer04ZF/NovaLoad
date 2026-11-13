# Timed Scheduler

## Purpose
Automate queue start, queue pause, and global bandwidth throttling windows without manual intervention.

## How Scheduler Rules Work
`DownloadManager` runs an interval every `5000 ms` calling `evaluateSchedules()`:
1. Reads all rules from the `schedules` table (`id`, `name`, `queueId`, `action`, `cronTime`, `daysOfWeek`, `speedLimitKbps`, `enabled`, `lastRunAt`).
2. Checks whether `enabled` is true, the current weekday (`0..6`, Sunday = `0`) is included in `daysOfWeek`, and local time `HH:MM` matches `cronTime`.
3. Uses a minute-granularity guard (`lastRunAt` prefix `YYYY-MM-DDTHH:MM`) so a rule executes at most once per scheduled minute.

## Supported Actions
- **`start_queue`**: Moves `paused` downloads in `queueId` to `queued` and calls `dispatchQueuedDownloads()`.
- **`pause_queue`**: Pauses `downloading` and `queued` downloads belonging to `queueId`.
- **`limit_speed`**: Updates `settings.globalSpeedLimitKbps` to the rule's configured `speedLimitKbps`.

Default seeded rule (disabled initially): `sched-night-start` (`01:00`, all days, `start_queue` on `night`).

## Related Documentation
- [Priority Queues](./queues.md)
- [Bandwidth & Speed Limits](./speed-limits.md)
