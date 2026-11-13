# NovaLoad User Guide

## 1. Installation & First Launch

### Running from Source (Node 22+ Full-Stack Mode)
```bash
npm install
npm run dev
```
Navigate to `http://localhost:3000`. On first boot, NovaLoad initializes `.novaload/novaload.db`, creates `.novaload/downloads/`, and generates a unique `browserBridgeToken`.

### Native Desktop Builds (Tauri 2)
See [`docs/release/PACKAGING.md`](../release/PACKAGING.md) for Windows (`.exe`, `.msi`), Linux (`.AppImage`, `.deb`, `.rpm`), and macOS (`.dmg`) installation instructions, upgrades, and clean uninstallation.

## 2. Managing Downloads

- **Add Download**: Click **Add Download** in the top bar. Paste any `http://` or `https://` URL and click **Inspect URL** to preview file size, MIME type, and whether the server supports HTTP Range acceleration.
- **Batch Import**: Switch to **Batch List** inside the New Download modal to import up to 50 URLs at once.
- **Table & Card Views**: Toggle between dense table inspection and visual cards in any transfer view.
- **Pause, Resume, Retry**: Pausing aborts active segment streams cleanly and stores byte offsets in SQLite. Resuming continues from exact offsets on Range-capable servers.
- **Segment & Checksum Inspector**: Click any filename to open the right-hand inspector drawer showing live per-connection segment bars, SHA-256 / SHA-512 hashes, per-download speed caps, and event logs.

## 3. Queues, Categories & Scheduler

- **Queues**: Configure max concurrent downloads, default connections per file, and queue bandwidth limits. Drag and drop rows or use arrow buttons to reorder queue priorities.
- **Categories**: Completed transfers automatically route into subfolders (`/Software`, `/Archives`, `/Documents`, `/Video`, `/Audio`, `/Images`) based on file extension.
- **Scheduler**: Create daily/weekly rules (`start_queue`, `pause_queue`, `limit_speed`) evaluated automatically by the background scheduler.

## 4. Video & Open Media Downloader

Open **Video & Media** to inspect direct MP4/WebM/MP3 links and open HLS (`.m3u8`) playlists. Select a resolution or audio-only track to enqueue a transfer. NovaLoad does not bypass DRM or gated authentication.

## 5. Browser Integration

Install the Manifest V3 extension from `extensions/chrome-edge` (Chrome/Edge) or `extensions/firefox` (Firefox), open the extension popup, and paste the **Bridge Auth Token** shown in **Browser Bridge**. Right-click any link or media element and choose **Download with NovaLoad**.

## 6. Gemini AI File Assistant

NovaLoad works 100% without AI. When `GEMINI_API_KEY` is configured in the server environment, **AI Assistant** can answer storage questions, locate large or duplicate files, and propose folder cleanups. Every proposed file mutation appears in a **Preview & Confirm** checklist before execution.
