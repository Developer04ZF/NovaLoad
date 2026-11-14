# Production Builds Overview

## Build Modes

### 1. Web & Node.js Production Runtime
Produces an optimized Vite bundle served statically by `server.ts`:

```bash
npm ci
npm run lint
npm test
npm run build
NODE_ENV=production npm start
```

### 2. Native Desktop Packaging (`src-tauri/`)
Tauri 2 packaging configuration (`src-tauri/tauri.conf.json`) and GitHub Actions (`.github/workflows/release.yml`) target 6 platform architectures across Windows, Linux, and macOS:
- **Windows**: `x86_64-pc-windows-msvc`, `aarch64-pc-windows-msvc` (`.exe` NSIS, `.msi`, portable `.zip`)
- **Linux**: `x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu` (`.AppImage`, `.deb`, `.rpm`)
- **macOS**: `aarch64-apple-darwin`, `x86_64-apple-darwin` (`.dmg`, `.app.tar.gz`)

> Note: Native installer builds require Rust (`stable`), Tauri CLI, and platform WebView SDKs, while bundling the embedded `novaload-server` Node 22 SEA sidecar (`scripts/build-sidecar.mjs`). Signing requires configured repository certificates.

## Related Documentation
- [Releases Overview](../releases/README.md)
- [Building Releases & Sidecars](../releases/building-releases.md)
- [Windows Packaging](./windows.md)
- [Linux Packaging](./linux.md)
- [macOS Packaging](./macos.md)
- [GitHub Actions CI/CD](./github-actions.md)
