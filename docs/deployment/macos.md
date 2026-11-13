# macOS Packaging

## Prerequisites
- macOS with Xcode Command Line Tools (`xcode-select --install`)
- Node.js `>= 22.5`
- Rust stable targets: `aarch64-apple-darwin` (Apple Silicon) and `x86_64-apple-darwin` (Intel)

## Building `.dmg` & `.app` Bundles
```bash
npm ci
npm run build
cd src-tauri
cargo tauri build --target aarch64-apple-darwin
```

## Signing & Notarization
To ship signed and notarized macOS builds without Gatekeeper warnings, configure Developer ID certificates and notarization credentials (`APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`) in GitHub Actions release secrets.

## Related Documentation
- [Production Builds Overview](./production-builds.md)
- [Release Process & Signing](./release-process.md)
