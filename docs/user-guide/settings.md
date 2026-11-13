# Application Settings & Localization

## Settings Categories (`src/components/SettingsView.tsx`)
Settings persist in SQLite (`PUT /api/settings`):
- **Appearance & Language**:
  - **Theme**: `dark`, `light`, or `system` (follows `prefers-color-scheme`).
  - **Locale**: English (`en`, LTR), Persian (`fa`, RTL), and Arabic (`ar`, RTL). Switching locales updates `<html lang>` and `dir="rtl" | "ltr"` immediately.
- **Engine Defaults**: Default segment connections (`1–16`), global max concurrent downloads, global speed cap (`KB/s`), auto-categorization, checksum verification on complete, auto-retry, and max retries.
- **Privacy & SSRF**: Toggle `privacyBlockPrivateIps` (enabled by default).
- **AI Controls**: Enable/disable AI assistant, choose model (`gemini-4-hydrogen` or `gemini-3.1-flash-lite`), toggle confirmation/metadata settings, or inspect server key status (`GET /api/ai/status`).
- **Database Maintenance**: Check SQLite `PRAGMA integrity_check` status and export a redacted JSON backup (`GET /api/database/export`).

## Related Documentation
- [Configuration Reference](../reference/configuration-reference.md)
- [Accessibility & RTL Support](../design/accessibility.md)
