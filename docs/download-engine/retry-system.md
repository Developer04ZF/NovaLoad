# Retry & Exponential Backoff System

## Retry Conditions
When a segment or verification error throws (and was not caused by user `pause`, `cancel`, or `AbortError`):
- If `settings.autoRetry === true` and `current.retryCount < current.maxRetries` (default `3`):
  - `retryCount` increments by `1`.
  - Download returns to `status: 'queued'` with `errorMessage` recording `Retry X/Y: <redacted reason>`.
  - A `'warn'` entry appends to `download_events`.
  - `dispatchQueuedDownloads()` is re-scheduled after exponential backoff:
    `delayMs = Math.min(8000, 1000 * 2 ** nextRetry)` (2s, 4s, 8s).

## Terminal Failure & Manual Retry
- Once `retryCount >= maxRetries` (or if `autoRetry` is off), the download transitions to `status: 'failed'` and logs an `'error'` event.
- Clicking **Retry** (`POST /api/downloads/:id/retry`) removes any stale `.part` file, rebuilds initial segment ranges, resets counters to `0`, and starts cleanly.

## Related Documentation
- [Error Handling & Diagnostics](./error-handling.md)
- [Pause & Resume Mechanism](./resume-mechanism.md)
