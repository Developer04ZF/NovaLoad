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
- Chrome/Edge/Firefox Manifest V3 extensions and token-authenticated local bridge.
- Dark, Light, and System themes + English (LTR), Persian (RTL), and Arabic (RTL) localization.
- Custom NovaLoad geometric logo, Novi mascot (7 expressions), and 16 custom SVG illustrations.
- Companion CLI (`cli/novaload.ts`), Vitest suite, and GitHub Actions CI/CD pipelines.
