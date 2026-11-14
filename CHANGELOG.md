# Changelog

All notable changes to NovaLoad are documented in this file.

## [1.0.0] - 2026-11-13

### Added
- Multi-connection HTTP/HTTPS Range download engine (`server/engine/downloadManager.ts` & `src-tauri/src/engine.rs`) with automatic single-stream fallback.
- Persistent SQLite database (`node:sqlite`) with versioned migrations, segment byte checkpoints, event logs, and integrity checks.
- Streaming SHA-256 and SHA-512 verification and duplicate file detection.
- Multiple queues, priority reordering, extension-based auto-categorization, and timed scheduler.
- Open media & HLS playlist inspector (`VideoDownloaderView`) without DRM bypass.
- Optional server-side Gemini AI file organizer (`@google/genai`) with preview-and-confirm action plans.
- Embedded standalone Node.js 22 SEA backend sidecar (`scripts/build-server.mjs` + `scripts/build-sidecar.mjs`) managed automatically by Tauri 2 (`src-tauri/src/lib.rs`) on dynamic localhost ports with per-session local auth token and clean stdin-EOF shutdown.
- Four self-contained Manifest V3 browser extensions (`extensions/brave`, `chrome`, `edge`, `firefox`) + zipped GitHub release bundles (`NovaLoad-{Brave,Chrome,Edge,Firefox}-Extension-v1.0.0.zip`) with `Test Connection` popup check and `/api/bridge/ping`.
- Security & engine reliability hardening: Range-ignored `200 OK` segment consolidation, `ETag` resume validation, `0`-byte completion, `ENOSPC`/`EACCES` diagnostics, `::ffff:` IPv4-mapped IPv6 & DNS-rebinding SSRF blocking, and symlink-safe realpath containment.
- Dark, Light, and System themes + English (LTR), Persian (RTL), and Arabic (RTL) localization.
- Custom NovaLoad brand identity (`assets/branding/`), Novi mascot (8 expressions in `assets/branding/mascot/`), 9 feature illustrations (`assets/illustrations/`), 5 icons, and 8 animated SVGs with static fallbacks and verified GIF previews (`assets/animations/`).
- Redesigned `README.md`, categorized 11-section `docs/` knowledge base including 7 guides in `docs/releases/`, companion CLI (`cli/novaload.ts`), Vitest suite (security, integration, sidecar E2E, extensions, React UI), and GitHub Actions CI/release/security workflows (`npm run validate:release`).
