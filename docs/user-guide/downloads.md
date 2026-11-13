# Managing Downloads

## Adding Transfers
- **Single URL**: Click **Add Download**, enter an `http://` or `https://` URL, click **Inspect URL** to probe headers (`POST /api/downloads/probe`), pick category/queue/connections (`1..16`), and optionally supply an expected SHA-256 or SHA-512 hash.
- **Batch List**: Switch to **Batch List** inside the modal to submit up to 50 newline-delimited URLs at once (`POST /api/downloads/batch`).

## Filtering & View Modes
Sidebar transfer filters (`App.tsx` / `DownloadsView.tsx`) include:
- **All Downloads**, **Active**, **Queued**, **Paused**, **Completed**, **Failed**, and **History**.
- Search by filename/URL, filter by category, and toggle between **Table** view and **Card** view.

## Download Lifecycle Actions
Each transfer supports:
- **Pause** / **Resume** (`POST /api/downloads/:id/pause` and `/start`)
- **Retry** (`POST /api/downloads/:id/retry` resets segments for a fresh transfer)
- **Cancel** (`POST /api/downloads/:id/cancel` aborts streams and cleans up the `.part` file)
- **Delete** (`DELETE /api/downloads/:id`, with optional `?deleteFile=true` disk removal)
- **Verify Integrity** (`POST /api/downloads/:id/verify` computes or compares SHA-256 / SHA-512)

## Filename Collision Safety
`resolveUniqueDestination` never silently overwrites existing files on disk; duplicate names automatically receive `name (1).ext`, `name (2).ext`, up to `(999)`.

## Related Documentation
- [Multi-Connection Acceleration](./multi-connection.md)
- [Pause, Resume & Retries](./pause-resume.md)
