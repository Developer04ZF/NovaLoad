# System Design & Runtime Modes

## Runtime Modes

1. **Development Mode (`npm run dev` / `tsx server.ts`)**
   - `server.ts` creates `createServerApp()` (Express + `NovaDatabase` + `DownloadManager`), listens on `PORT` (default `3000`), and mounts Vite middleware (`createViteServer({ server: { middlewareMode: true } })`) for SPA routing.
   - `downloadManager.setLocalFixturesPort(port)` enables local deterministic fixture downloads while preserving SSRF protection against arbitrary localhost ports.
2. **Production Web / Local Server Mode (`npm run build && NODE_ENV=production npm start`)**
   - Serves pre-built assets from `dist/` via `express.static()` with SPA fallback to `dist/index.html`.
3. **Desktop Shell Mode (`src-tauri/`)**
   - Configured in `src-tauri/tauri.conf.json` (`beforeDevCommand: npm run dev`, `devUrl: http://localhost:3000`, `beforeBuildCommand: npm run build`, `frontendDist: ../dist`).
   - Adds native OS window management, tray menu (`Open NovaLoad` / `Quit`), `tauri-plugin-notification`, `tauri-plugin-updater`, and OS keyring credential commands.

## Clean Shutdown Behavior
`server.ts` registers `SIGINT` and `SIGTERM` handlers calling `downloadManager.destroy()`, `db.close()`, and closing the HTTP server so SQLite WAL state and active transfers shut down deterministically.

## Related Documentation
- [Tauri 2 Desktop Integration](./tauri-integration.md)
- [Express Backend & SSE Stream](./backend.md)
