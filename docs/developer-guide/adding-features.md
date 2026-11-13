# Adding New Features

## End-to-End Implementation Checklist
When adding functionality to NovaLoad:
1. **Shared Contracts**: Define TypeScript interfaces in `src/shared/types.ts`.
2. **Persistence**: Add SQLite schema changes via a versioned migration in `server/db.ts` (`runMigrations()`).
3. **Security Review**: Route any URL inputs through `validateDownloadUrl()`, any paths through `resolveSafePath()`, and any error strings through `redactSecrets()`.
4. **API & Real-Time Push**: Expose validated REST endpoints in `server/app.ts` and trigger `downloadManager.emit('snapshot', downloadManager.getSnapshot())` on state mutations.
5. **UI & Localization**: Add API wrappers in `src/lib/api.ts`, localization keys across `'en'`, `'fa'`, and `'ar'` in `src/lib/i18n.ts`, and components under `src/components/`.
6. **Tests & Docs**: Add Vitest coverage under `tests/` and update relevant pages in `docs/`, then run `npm run docs:validate`.

## Related Documentation
- [Coding Standards](./coding-standards.md)
- [Database Migrations](./database-migrations.md)
