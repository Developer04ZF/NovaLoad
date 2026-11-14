# Code Signing, Notarization & Trust Verification

NovaLoad never misrepresents unsigned CI artifacts as signed installers. Every release notes its cryptographic signing state transparently, and signature verification for the desktop updater is strictly enforced (`src-tauri/src/lib.rs`).

## Required GitHub Repository Secrets

Configure these repository secrets in **Settings → Secrets and variables → Actions** before cutting a public signed release:

### 1. Tauri Desktop Auto-Updater (Ed25519)
Generate a keypair with `cargo tauri signer generate -w ~/.tauri/novaload.key`:
- `TAURI_SIGNING_PUBLIC_KEY` — Public key string injected into `src-tauri/tauri.conf.json` during CI release builds.
- `TAURI_SIGNING_PRIVATE_KEY` — Contents of the generated private key file.
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — Key passphrase.

> When `TAURI_SIGNING_PUBLIC_KEY` is omitted, `check_for_updates` in `src-tauri/src/lib.rs` explicitly reports `status: "unconfigured"` rather than bypassing signature verification.

### 2. Windows Authenticode Signing
- `WINDOWS_CERTIFICATE` — Base64-encoded `.pfx` code-signing certificate (EV or OV Authenticode).
- `WINDOWS_CERTIFICATE_PASSWORD` — `.pfx` export password.

Without Authenticode signing, Windows SmartScreen will show an "Unknown publisher" warning on first run. Users should verify `SHA256SUMS.txt` before bypassing SmartScreen.

### 3. macOS Signing & Apple Notarization
- `APPLE_CERTIFICATE` — Base64-encoded Developer ID Application `.p12` certificate.
- `APPLE_CERTIFICATE_PASSWORD` — `.p12` password.
- `APPLE_SIGNING_IDENTITY` — Certificate common name (e.g., `Developer ID Application: ...`).
- `APPLE_ID` — Apple Developer account email.
- `APPLE_PASSWORD` — App-specific password for notarization.
- `APPLE_TEAM_ID` — 10-character Apple Developer Team ID.

Without Developer ID signing & notarization, macOS Gatekeeper prevents opening `.app` bundles until explicitly allowed via **System Settings → Privacy & Security** or `xattr -cr /Applications/NovaLoad.app` after verifying `SHA256SUMS.txt`.

### 4. Browser Extension Stores
- **Chrome Web Store / Brave (Chromium)**: Submit `NovaLoad-Chrome-Extension-v<VER>.zip` / `NovaLoad-Brave-Extension-v<VER>.zip` via the Chrome Web Store Developer Dashboard.
- **Microsoft Edge Add-ons**: Submit `NovaLoad-Edge-Extension-v<VER>.zip` via Partner Center.
- **Mozilla Add-ons (AMO)**: Submit `NovaLoad-Firefox-Extension-v<VER>.zip` (with `bridge@novaload.org`) for automated/manual signing to produce a signed `.xpi`.

## End-User Checksum Verification
Regardless of OS Gatekeeper/SmartScreen prompts, every artifact on GitHub Releases is covered by `SHA256SUMS.txt`:

```bash
# Linux / macOS
sha256sum -c SHA256SUMS.txt --ignore-missing

# Windows PowerShell
Get-FileHash .\NovaLoad_1.0.0_x64-setup.exe -Algorithm SHA256
```

## Related Documentation
- [Updating NovaLoad](./updating.md)
- [Release Process & Signing](../deployment/release-process.md)
