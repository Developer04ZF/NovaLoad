# Environment Variables

Only verified environment variables referenced in repository code (`.env.example`, `server.ts`, `server/db.ts`, `server/services/geminiService.ts`, `cli/novaload.ts`) are listed below:

| Variable | Default | Used In | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | `3000` | `server.ts` | HTTP server port for UI, REST API, and Browser Bridge. |
| `NODE_ENV` | `development` | `server.ts` | When `'production'`, serves `dist/` instead of mounting Vite dev middleware. |
| `NOVALOAD_DATA_DIR` | `./.novaload` | `server/db.ts` | Base directory for `novaload.db` and `downloads/`. |
| `GEMINI_API_KEY` | Unset | `server/services/geminiService.ts` | Optional server-side API key for `@google/genai` file organization features. |
| `APP_URL` | Unset | `.env.example` | Optional hosted application base URL metadata. |
| `NOVALOAD_API_URL` | `http://127.0.0.1:3000` | `cli/novaload.ts` | Target backend URL used by CLI subcommands. |
| `DISABLE_HMR` | Unset | `vite.config.ts` | When `'true'`, disables Vite HMR file watching. |

## Related Documentation
- [Configuration Guide](../getting-started/configuration.md)
- [Secrets Management](../security/secrets-management.md)
