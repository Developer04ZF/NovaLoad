# Multi-Platform Packaging, Signing & Release Guide

## 1. Release Matrix

`.github/workflows/release.yml` configures automated builds on pushed `v*` tags for:
- **Windows**: `x86_64-pc-windows-msvc` & `aarch64-pc-windows-msvc` (NSIS `.exe`, `.msi`, portable `.zip`)
- **Linux**: `x86_64-unknown-linux-gnu` & `aarch64-unknown-linux-gnu` (`.AppImage`, `.deb`, `.rpm`)
- **macOS**: `aarch64-apple-darwin` & `x86_64-apple-darwin` (`.dmg`, `.app.tar.gz`)

## 2. Code Signing & Notarization Prerequisites

Never distribute binaries claiming to be signed unless signed in CI with verified certificates:
- **Tauri Updater Signing**: Set `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` in GitHub Repository Secrets. Never commit private keys.
- **Windows Authenticode**: Configure `WINDOWS_CERTIFICATE` and `WINDOWS_CERTIFICATE_PASSWORD` for SmartScreen trust.
- **macOS Code Signing & Notarization**: Configure `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID`.

## 3. Checksums & SBOM

Every release generates an SPDX JSON Software Bill of Materials (`novaload-sbom.spdx.json`) via `anchore/sbom-action` alongside SHA-256 artifact checksums.

## 4. Upgrading & Uninstalling

- **Upgrading**: Install the new platform bundle over the existing installation or use the signature-verified in-app updater. SQLite migrations in `server/db.ts` and `src-tauri/migrations/` upgrade schemas automatically.
- **Uninstalling**: Remove the application binary via your OS package manager (`apt remove novaload`, Windows Apps & Features, or deleting `NovaLoad.app`) and optionally remove `.novaload/` if you do not wish to keep download history.
