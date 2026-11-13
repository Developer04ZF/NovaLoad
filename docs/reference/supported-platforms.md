# Supported Platforms Matrix

| Platform / Target | Mode | Status | Artifacts / Requirements |
| :--- | :--- | :--- | :--- |
| **Linux / macOS / Windows (Node.js `>= 22.5`)** | Full-Stack Web Server + React UI + CLI | **Implemented & Verified** | Built-in `node:sqlite`, `npm run dev` on port `3000` |
| **Windows 10/11 (`x64`, `ARM64`)** | Native Desktop (Tauri 2) | **Configured (`src-tauri/` & CI)** | NSIS `.exe`, `.msi`, portable `.zip` (requires Rust + MSVC + WebView2) |
| **Linux (`x64`, `ARM64`)** | Native Desktop (Tauri 2) | **Configured (`src-tauri/` & CI)** | `.AppImage`, `.deb`, `.rpm` (requires Rust + WebKitGTK 4.1 headers) |
| **macOS (`aarch64`, `x86_64`)** | Native Desktop (Tauri 2) | **Configured (`src-tauri/` & CI)** | `.dmg`, `.app.tar.gz` (requires Rust + Xcode CLT) |
| **Google Chrome / Microsoft Edge** | Browser Extension (MV3) | **Implemented (Unpacked Source)** | `extensions/chrome-edge/` |
| **Mozilla Firefox (`>= 115.0`)** | Browser Extension (MV3) | **Implemented (Temporary Add-on)** | `extensions/firefox/` (`bridge@novaload.org`) |

## Related Documentation
- [Installation Guide](../getting-started/installation.md)
- [Production Builds Overview](../deployment/production-builds.md)
