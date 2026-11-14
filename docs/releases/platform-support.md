# Platform Support & Release Artifacts

## Desktop Installers (Bundled Standalone Runtime)

All desktop installers include the embedded `novaload-server` binary—end users do **not** need Node.js installed separately.

| Operating System | Architecture | Target Triple | Release Formats | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Windows 10 / 11** | `x64` (`x86_64`) | `x86_64-pc-windows-msvc` | `.exe` (NSIS), `.msi` | Built in Release CI (`windows-latest`) |
| **Windows 10 / 11** | `ARM64` (`aarch64`) | `aarch64-pc-windows-msvc` | `.exe` (NSIS), `.msi` | Built in Release CI (`windows-latest` + downloaded ARM64 Node binary verified by official `SHASUMS256.txt`) |
| **macOS** | Apple Silicon (`M1+`) | `aarch64-apple-darwin` | `.dmg`, `.app.tar.gz` | Built in Release CI (`macos-latest`) |
| **macOS** | Intel (`x86_64`) | `x86_64-apple-darwin` | `.dmg`, `.app.tar.gz` | Built in Release CI (`macos-13`) |
| **Linux** | `x64` (`x86_64`) | `x86_64-unknown-linux-gnu` | `.AppImage`, `.deb`, `.rpm` | Sidecar verified locally; installers built in Release CI (`ubuntu-22.04`) |
| **Linux** | `ARM64` (`aarch64`) | `aarch64-unknown-linux-gnu` | `.AppImage`, `.deb`, `.rpm` | Built in Release CI (`ubuntu-22.04-arm`) |

### Minimum Runtime Dependencies
- **Windows**: Microsoft Edge WebView2 Runtime (preinstalled on Windows 11 and modern Windows 10; bootstrapped automatically by NSIS installer if missing).
- **macOS**: macOS 11+ with built-in WKWebView.
- **Linux**: `libwebkit2gtk-4.1` / `gtk3` (installed automatically via `.deb` / `.rpm` dependencies; `.AppImage` runs portably on modern distributions with FUSE).

## Browser Extensions (Manifest V3)

| Browser | Artifact Filename | Source Directory | Minimum Version |
| :--- | :--- | :--- | :--- |
| **Brave** | `NovaLoad-Brave-Extension-v1.0.0.zip` | `extensions/brave/` | Brave `>= 1.50` (Chromium MV3) |
| **Google Chrome** | `NovaLoad-Chrome-Extension-v1.0.0.zip` | `extensions/chrome/` | Chrome `>= 110` (MV3) |
| **Microsoft Edge** | `NovaLoad-Edge-Extension-v1.0.0.zip` | `extensions/edge/` | Edge `>= 110` (MV3) |
| **Mozilla Firefox** | `NovaLoad-Firefox-Extension-v1.0.0.zip` | `extensions/firefox/` | Firefox `>= 115.0` (MV3 + Gecko ID `bridge@novaload.org`) |

## Server / CLI Mode (Node.js `>= 22.5.0`)
- Users running headless servers or NAS environments can run `npm run build && NODE_ENV=production npm start` or invoke `npx tsx cli/novaload.ts` on any OS with Node.js `>= 22.5.0`.

## Related Documentation
- [Supported Platforms Reference](../reference/supported-platforms.md)
- [Browser Extensions Distribution](./browser-extensions.md)
