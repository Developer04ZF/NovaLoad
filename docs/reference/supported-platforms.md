# Supported Platforms Matrix

| Platform / Target | Mode | Status | Artifacts / Requirements |
| :--- | :--- | :--- | :--- |
| **Linux / macOS / Windows (Node.js `>= 22.5`)** | Full-Stack Web Server + React UI + CLI | **Implemented & Verified** | Built-in `node:sqlite`, `npm run dev` on port `3000` |
| **Linux (`x64`) Embedded Desktop Sidecar** | Standalone Node 22 SEA Sidecar Binary | **Compiled & E2E Verified Locally** | `src-tauri/binaries/novaload-server-x86_64-unknown-linux-gnu` (`tests/sidecar.test.ts`) |
| **Windows 10/11 (`x64`, `ARM64`)** | Native Desktop (Tauri 2 + Bundled Sidecar) | **Configured (`src-tauri/` & Release CI)** | NSIS `.exe`, `.msi` (no external Node.js needed at runtime) |
| **Linux (`x64`, `ARM64`)** | Native Desktop (Tauri 2 + Bundled Sidecar) | **Configured (`src-tauri/` & Release CI)** | `.AppImage`, `.deb`, `.rpm` |
| **macOS (`aarch64`, `x86_64`)** | Native Desktop (Tauri 2 + Bundled Sidecar) | **Configured (`src-tauri/` & Release CI)** | `.dmg`, `.app.tar.gz` |
| **Brave Browser** | Browser Extension (MV3) | **Packaged & Validated (`v1.0.0`)** | `extensions/brave/` & `NovaLoad-Brave-Extension-v1.0.0.zip` |
| **Google Chrome** | Browser Extension (MV3) | **Packaged & Validated (`v1.0.0`)** | `extensions/chrome/` & `NovaLoad-Chrome-Extension-v1.0.0.zip` |
| **Microsoft Edge** | Browser Extension (MV3) | **Packaged & Validated (`v1.0.0`)** | `extensions/edge/` & `NovaLoad-Edge-Extension-v1.0.0.zip` |
| **Mozilla Firefox (`>= 115.0`)** | Browser Extension (MV3) | **Packaged & Validated (`v1.0.0`)** | `extensions/firefox/` & `NovaLoad-Firefox-Extension-v1.0.0.zip` (`bridge@novaload.org`) |

## Related Documentation
- [Platform Support & Release Artifacts](../releases/platform-support.md)
- [Installation Guide](../getting-started/installation.md)
- [Production Builds Overview](../deployment/production-builds.md)
