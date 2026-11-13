# Introduction & Feature Matrix

## Purpose
NovaLoad is an open-source download manager and file organization workspace built around deterministic HTTP/HTTPS transfers, persistent SQLite recovery, and strong local security boundaries.

## What NovaLoad Solves
Legacy download managers often lack transparent segment inspection, rely on outdated single-platform UI toolkits, leak telemetry, or treat filesystem operations carelessly. Browser built-in download bars lack multi-connection acceleration, persistent queues, per-queue throttling, and built-in SHA-256/SHA-512 verification.

NovaLoad unifies:
- **Multi-connection HTTP/HTTPS range transfers** (`1..16` parallel segments) with graceful single-stream fallback.
- **Persistent SQLite state** (`node:sqlite` in WAL mode) for reliable pause/resume across restarts.
- **Priority queues, auto-categorization, and timed scheduling**.
- **Server-side integrity hashing** (SHA-256 and SHA-512) and disk duplicate detection.
- **Token-authenticated browser handoff** (Manifest V3 extensions for Chrome, Edge, and Firefox) and companion CLI.
- **Optional Gemini AI file organization** running strictly server-side behind a Preview & Confirm dialog.

## Feature Status Matrix

| Capability | Status | Where Implemented |
| :--- | :--- | :--- |
| Multi-connection HTTP/HTTPS Range downloads (`1–16`) | Implemented | `server/engine/downloadManager.ts` |
| Automatic single-stream fallback when `Accept-Ranges` absent | Implemented | `server/engine/downloadManager.ts` |
| Persistent SQLite pause/resume & startup recovery | Implemented | `server/db.ts`, `server/engine/downloadManager.ts` |
| Token-bucket bandwidth limiting (global, queue, per-item) | Implemented | `server/engine/downloadManager.ts` |
| Automatic retries with exponential backoff | Implemented | `server/engine/downloadManager.ts` |
| SHA-256 / SHA-512 checksum computation & verification | Implemented | `server/engine/downloadManager.ts` |
| Queues, drag-drop priority reorder, categories, scheduler | Implemented | `server/db.ts`, `src/components/QueuesAndSchedulerView.tsx` |
| Direct media & open HLS (`.m3u8`) probe | Implemented | `server/services/mediaService.ts` |
| Manifest V3 browser extensions & local bridge API | Implemented | `extensions/`, `server/app.ts` |
| Optional Gemini AI metadata analyzer + Preview & Confirm | Implemented | `server/services/geminiService.ts`, `src/components/AiAssistantView.tsx` |
| Companion CLI (`download`, `list`, `pause`, `resume`, `cancel`, `queue`, `version`) | Implemented | `cli/novaload.ts` |
| Native desktop packaging (Windows / Linux / macOS) | Configured (`src-tauri/` & CI) | `src-tauri/`, `.github/workflows/release.yml` |
| DRM / Encrypted stream bypass or BitTorrent | Unsupported / Out of Scope | See [Known Limitations](../reference/known-limitations.md) |

## Related Documentation
- [Installation Guide](./installation.md)
- [Your First Download](./first-download.md)
- [Architecture Overview](../architecture/overview.md)
