# Updating NovaLoad

## How In-App Updates Work

NovaLoad integrates `tauri-plugin-updater` inside the desktop shell (`src-tauri/src/lib.rs`) and exposes an interactive update check in **Settings → About**.

- **Endpoint**: `https://github.com/Developer04ZF/NovaLoad/releases/latest/download/latest.json`
- **Strict Signature Enforcement**: Tauri validates every update archive against the embedded Ed25519 `pubkey` (`TAURI_SIGNING_PUBLIC_KEY`). Updates are **never** downloaded or installed without a valid cryptographic signature.
- **Graceful Handling When Unsigned**: If the running binary was built without `TAURI_SIGNING_PUBLIC_KEY` (e.g., local source build or unsigned community CI draft), clicking **Check for Updates** honestly reports that signed auto-updates are unavailable for that build and links to the [GitHub Releases](https://github.com/Developer04ZF/NovaLoad/releases) page.

## Manual Upgrading (All Platforms)
1. Pause active transfers in NovaLoad and exit the application cleanly so the SQLite WAL file checkpoints (`novaload.db`) and the embedded backend releases file locks.
2. Download the newer release installer and `SHA256SUMS.txt` from [GitHub Releases](https://github.com/Developer04ZF/NovaLoad/releases).
3. Verify the downloaded file's SHA-256 hash matches `SHA256SUMS.txt`.
4. Run the installer (`.exe`/`.msi`, `.dmg`, `.deb`/`.rpm`, or replace `.AppImage`).
5. Launch NovaLoad—schema migrations in `server/db.ts` run automatically while preserving existing queues, downloads, and settings.

## Browser Extension Updates
- When installed via store listings (Chrome Web Store, Edge Add-ons, Mozilla AMO), updates install automatically.
- When installed unpacked from release ZIPs, download the matching `NovaLoad-<Browser>-Extension-v<NEW>.zip`, replace the extracted directory files, and click **Reload** on your browser's extension page.

## Related Documentation
- [Upgrading & Database Migrations](../getting-started/upgrading.md)
- [Code Signing & Certificates](./code-signing.md)
