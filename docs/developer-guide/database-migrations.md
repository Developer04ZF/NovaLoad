# Database Migrations

## Migration Engine (`server/db.ts`)
`NovaDatabase.runMigrations()` creates a `schema_migrations` ledger (`version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT`) and executes pending migrations inside explicit `BEGIN ... COMMIT` transactions with `ROLLBACK` on error.

## Existing Migrations
1. **`version: 1` (`initial_schema`)**: Creates `queues`, `categories`, `downloads`, `download_segments`, `download_events`, `schedules`, `settings`, `ai_history`, and `plugins`.
2. **`version: 2` (`indexes_and_browser_captures`)**: Adds performance indexes (`idx_downloads_status`, `idx_downloads_queue`, `idx_segments_download`) and `browser_captures`.

## Adding a New Migration
1. Append `{ version: N, name: 'descriptive_snake_case', sql: '...' }` to `migrations` in `server/db.ts`.
2. Keep migrations idempotent where possible (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
3. Update `exportSnapshot()` `schemaVersion` and shared TypeScript types in `src/shared/types.ts` if adding tables/columns.
4. Add an integration test verifying schema creation on a fresh temporary `NOVALOAD_DATA_DIR`.

## Related Documentation
- [SQLite Database Schema](../architecture/database.md)
- [Upgrading NovaLoad](../getting-started/upgrading.md)
