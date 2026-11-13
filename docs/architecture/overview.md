# Architecture Overview

## Purpose
NovaLoad separates interactive UI presentation, REST/SSE orchestration, multi-connection transfer execution, SQLite persistence, and native desktop OS integration into clear layers.

## System Topology

```mermaid
flowchart LR
  UI["React 19 UI (src/)"] -->|REST + SSE /api/events| API["Express API (server/app.ts)"]
  CLI["Companion CLI (cli/novaload.ts)"] -->|HTTP REST| API
  EXT["Chrome / Edge / Firefox MV3"] -->|POST /api/bridge/capture + token| API
  TAURI["Tauri 2 Shell (src-tauri/)"] -->|WebView + Tray + Keyring| UI
  API --> ENG["DownloadManager (server/engine/)"]
  API --> FM["FileManagerService"]
  API --> MED["MediaService"]
  API --> AI["GeminiAssistantService (@google/genai)"]
  ENG --> DB[("node:sqlite WAL (.novaload/novaload.db)")]
  ENG --> FS[("Managed Downloads (.novaload/downloads/)")]
  FM --> FS
  ENG --> SEC["Security Guard (server/security.ts)"]
```

## Core Responsibilities
- **`src/`**: React 19 + TypeScript + Tailwind v4 SPA presenting live snapshots, segment telemetry, queue management, media probe, file manager, and preview-confirm AI workflows.
- **`server/`**: Express HTTP server (`server.ts` + `server/app.ts`) hosting engine routes, deterministic `/api/fixtures/*` endpoints, and server-side `@google/genai` calls.
- **`server/engine/`**: Segmented HTTP/HTTPS `DownloadManager`, `TokenBucketPacer`, scheduler timer, and streaming SHA-256/SHA-512 hashers.
- **`server/db.ts`**: Node `node:sqlite` (`DatabaseSync`) persistence layer with versioned migrations and startup crash recovery.
- **`src-tauri/`**: Rust Tauri 2 desktop shell configuring system tray, notifications, updater, OS keyring helpers, and native Rust engine/security modules (`engine.rs`, `security.rs`).

## Related Documentation
- [System Design & Runtime Modes](./system-design.md)
- [End-to-End Data Flow](./data-flow.md)
