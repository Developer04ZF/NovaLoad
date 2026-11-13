# Uninstalling & Clean Removal

## Removing Source / Node Runtime Installation
1. Stop the running NovaLoad server (`Ctrl+C` or stop your process manager).
2. Remove the cloned repository directory.
3. If you stored `NOVALOAD_DATA_DIR` outside the repo, remove it only if you do not want to keep downloaded files or SQLite history.

## Removing Browser Extensions
- **Chrome / Edge**: Open `chrome://extensions` (or `edge://extensions`), locate **NovaLoad Download Bridge**, and click **Remove**.
- **Firefox**: Open `about:addons`, select **NovaLoad Download Bridge**, and click **Remove**.

## Removing Native Desktop Bundles (Tauri 2)
- **Windows**: Uninstall via **Settings → Apps → Installed apps → NovaLoad**.
- **Linux (Debian/Ubuntu)**: `sudo apt remove novaload` (or `sudo rpm -e novaload` on RPM distributions, or delete the `.AppImage` binary).
- **macOS**: Move `NovaLoad.app` from `/Applications` to Trash.

If you stored a key via OS Keyring integration in Tauri (`store_secret_in_keyring`), clear credentials using OS Credential Manager / Keychain Access or `delete_secret_from_keyring`.

## Related Documentation
- [Upgrading NovaLoad](./upgrading.md)
- [Privacy Policy](../security/privacy.md)
