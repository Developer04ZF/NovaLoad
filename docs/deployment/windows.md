# Windows Packaging

## Prerequisites
- Windows 10/11 (`x64` or `ARM64`)
- Node.js `>= 22.5`
- Microsoft Visual Studio C++ Build Tools + Windows 10/11 SDK
- WebView2 Runtime (pre-installed on Windows 11)
- Rust stable toolchain (`x86_64-pc-windows-msvc` or `aarch64-pc-windows-msvc`) + Tauri CLI

## Building Installers
```powershell
npm ci
npm run build
cd src-tauri
cargo tauri build --target x86_64-pc-windows-msvc
```

Configured in `src-tauri/tauri.conf.json`:
- NSIS `.exe` installer uses `installMode: "currentUser"`.
- `.msi` WiX installer and portable `.zip` are supported by `tauri-apps/tauri-action` on `windows-latest`.

## Code Signing
Configure Authenticode certificates in CI secrets before distributing public Windows binaries to avoid SmartScreen warnings.

## Related Documentation
- [Production Builds Overview](./production-builds.md)
- [Release Process & Signing](./release-process.md)
