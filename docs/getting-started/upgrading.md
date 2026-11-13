# Upgrading NovaLoad & Database Migrations

## Purpose
Safely upgrade NovaLoad source builds or desktop bundles while preserving download history, queues, and `.part` resume state.

## Backing Up State Before Upgrading
All state lives in `NOVALOAD_DATA_DIR` (default `.novaload/`):
- `novaload.db` (+ `-wal` / `-shm` files if running)
- `downloads/` containing finished files and active `.part` files

You can also export a redacted JSON backup at any time from **Settings** or via:

```bash
curl -s http://127.0.0.1:3000/api/database/export > novaload-backup.json
```

> Note: `GET /api/database/export` automatically redacts `browserBridgeToken` (`[REDACTED_ON_EXPORT]`).

## Upgrading from Git Source
1. Pause active transfers via **Pause All** (or allow clean SIGINT/SIGTERM shutdown).
2. Pull changes and refresh dependencies:
   ```bash
   git pull origin main
   npm install
   npm run build
   ```
3. Restart NovaLoad (`npm run dev` or `NODE_ENV=production npm start`).
4. On boot, `NovaDatabase` executes any unapplied entries in `schema_migrations` inside atomic `BEGIN ... COMMIT` transactions. Any downloads interrupted mid-flight transition safely to `paused`.

## Upgrading Tauri Desktop Bundles
- Install the newer `.exe`, `.msi`, `.deb`, `.rpm`, `.AppImage`, or `.dmg` release bundle, or accept verified updates through `tauri-plugin-updater` once signed releases are published to `https://github.com/Developer04ZF/NovaLoad/releases/latest/download/latest.json`.

## Related Documentation
- [Database Schema & Migrations](../developer-guide/database-migrations.md)
- [Uninstalling NovaLoad](./uninstalling.md)
