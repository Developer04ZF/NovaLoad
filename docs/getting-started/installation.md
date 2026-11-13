# Installation Guide

## Prerequisites

### Local Web / Full-Stack Runtime
- **Node.js `>= 22.5.0`** (required because `server/db.ts` uses Node's built-in `node:sqlite` `DatabaseSync` module)
- **npm `>= 10`**
- **Operating System**: Windows 10/11, Linux (glibc/ARM64 or x64), or macOS (Intel / Apple Silicon)

### Optional Native Desktop Build Prerequisites (Tauri 2)
To build native installers locally using `src-tauri/`:
- **Rust stable toolchain** (`rustup`, `cargo`, `rustc`)
- **Tauri CLI**: `cargo install tauri-cli` (or `npx tauri`)
- **Windows**: Microsoft Visual Studio C++ Build Tools + WebView2 Runtime
- **Linux (Debian/Ubuntu)**: `sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf rpm`
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)

---

## Option 1: Run from Source (All Platforms)

```bash
git clone https://github.com/Developer04ZF/NovaLoad.git
cd NovaLoad
npm install
npm run dev
```

Once started, open `http://localhost:3000` in your browser. On first boot NovaLoad creates `.novaload/novaload.db` and `.novaload/downloads/` automatically.

To run a production-built frontend served by Express:

```bash
npm run build
NODE_ENV=production npm start
```

---

## Option 2: Platform-Specific Desktop Packaging (`src-tauri/`)

NovaLoad includes a complete Tauri 2 workspace under `src-tauri/` and automated build workflows in `.github/workflows/release.yml`.

### Windows (10/11 — x64 & ARM64)
1. Install Node.js 22+, Rustup (`x86_64-pc-windows-msvc` or `aarch64-pc-windows-msvc`), and MSVC Build Tools.
2. Run `npm install`.
3. Build `.exe` (NSIS) / `.msi` installers with `cargo tauri build` inside `src-tauri/` (or via GitHub Actions tag release).

### Linux (x64 & ARM64)
1. Install WebKitGTK and packaging headers:
   ```bash
   sudo apt-get update
   sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf rpm
   ```
2. Run `npm install`.
3. Build `.AppImage`, `.deb`, and `.rpm` bundles from `src-tauri/` with `cargo tauri build`.

### macOS (Apple Silicon & Intel)
1. Install Xcode Command Line Tools, Node.js 22+, and Rustup (`aarch64-apple-darwin` or `x86_64-apple-darwin`).
2. Run `npm install`.
3. Build `.dmg` / `.app.tar.gz` bundles via `cargo tauri build` inside `src-tauri/`.

> **Note:** Pre-built signed installers are generated only when release workflows run with signing secrets configured. Local builds without signing keys produce unsigned development bundles.

---

## Verifying Your Installation

```bash
npm run lint
npm test
npx tsx cli/novaload.ts version
```

## Troubleshooting
- **`Cannot find module 'node:sqlite'`**: Check `node -v`. Upgrade to Node.js `22.5` or newer.
- **Port `3000` already in use**: Start with `PORT=3100 npm run dev` and pass `NOVALOAD_API_URL=http://127.0.0.1:3100` to the CLI.

## Related Documentation
- [Configuration Guide](./configuration.md)
- [Your First Download](./first-download.md)
- [Production Builds](../deployment/production-builds.md)
