# NovaLoad

**Download smarter. Manage everything.**

NovaLoad is an open-source, cross-platform desktop download manager designed to combine multi-connection transfer acceleration, persistent segmented pause/resume, queue scheduling, open media inspection, browser integration, and optional Gemini AI file organization inside a clean, high-craft interface.

---

## Key Capabilities

- **Multi-Connection Acceleration**: Splits HTTP/HTTPS transfers into configurable parallel byte-range segments (1–16 connections) when servers advertise `Accept-Ranges: bytes`, with automatic single-stream fallback when unsupported.
- **Persistent Transfers & Integrity**: Saves segment offsets, ETag headers, and event logs in SQLite for crash-safe pause/resume and streams finished files through SHA-256 and SHA-512 checksum verification.
- **Queues, Categories & Scheduler**: Multiple priority queues with concurrency caps, drag-and-drop ordering, extension-based folder routing, and timed schedule execution.
- **Open Media & Video Downloader**: Inspects direct media containers and open HLS (`.m3u8`) playlists to select resolutions or audio tracks without DRM bypass.
- **Browser Integration**: Minimal-permission Manifest V3 extensions for Chrome, Edge, and Firefox (`extensions/`) communicating over a token-authenticated local bridge (`/api/bridge/capture`).
- **Optional Gemini AI Assistant**: Analyzes local file metadata via server-side `@google/genai` routes and proposes organization plans using a strict preview-and-confirm workflow. Never required for normal downloading.
- **Security by Design**: SSRF blocking for private/loopback/metadata IPs, path traversal containment, zero hidden telemetry, and no automatic execution of downloaded files.
- **Theme & Internationalization**: Synchronized Dark, Light, and System themes, reduced-motion compliance, and English (LTR), Persian (RTL), and Arabic (RTL) support.

---

## Supported Platforms

- **Windows** (10/11 — x64, ARM64): NSIS `.exe`, `.msi`, portable `.zip` (configured in `src-tauri/` & `.github/workflows/release.yml`)
- **Linux** (x64, ARM64): `.AppImage`, `.deb`, `.rpm`
- **macOS** (Apple Silicon & Intel): `.dmg`, `.app.tar.gz` / `.zip`
- **Local Web / Server Mode**: Node.js 22+ full-stack runtime on port `3000`

---

## Quick Start

### Prerequisites

- Node.js `>= 22.5` (uses built-in `node:sqlite`)
- npm `>= 10`
- Optional for native desktop packaging: Rust stable toolchain + Tauri 2 CLI (`cargo install tauri-cli`)

### Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Run Tests & Type Check

```bash
npm test
npm run lint
npm run build
```

### Companion CLI

```bash
npx tsx cli/novaload.ts version
npx tsx cli/novaload.ts download http://127.0.0.1:3000/api/fixtures/file/novaload-linux-x64.tar.gz --connections 6
npx tsx cli/novaload.ts list
```

---

## Documentation

Complete user, design system, architecture, security, and release documentation lives in [`docs/`](./docs/README.md) and inside the in-app **Documentation** view.

## Contributing & Security

- Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) before submitting pull requests.
- Report security vulnerabilities responsibly following [`SECURITY.md`](./SECURITY.md).

## License

- Application source code: [Apache License 2.0](./LICENSE)
- Documentation: CC BY 4.0
- Attribution notices: [`NOTICE`](./NOTICE) & [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md)
