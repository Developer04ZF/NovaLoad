# Backend Development

## App Composition (`server/app.ts`)
`createServerApp({ dataDir, localFixturesPort, startTimers })` returns `{ app, db, downloadManager, fileManager, mediaService, geminiService }`. Keeping server wiring decoupled from `app.listen()` allows tests to spin up ephemeral servers cleanly on `port: 0`.

## Adding Endpoints
1. Validate input parameters with `zod` or explicit guards.
2. Wrap errors in `redactSecrets((err as Error).message)` before returning HTTP 4xx/5xx JSON.
3. Emit updated state with `downloadManager.emit('snapshot', downloadManager.getSnapshot())` whenever persistent download/queue/category/schedule/settings state changes so SSE clients refresh instantly.

## Determinism in Tests
When testing without timers or real internet endpoints, set `startTimers: false` and mount `createFixtureRouter()` (`/api/fixtures/*`), passing the ephemeral server's bound port to `downloadManager.setLocalFixturesPort(port)`.

## Related Documentation
- [REST & SSE API Reference](./api-reference.md)
- [Express Backend Architecture](../architecture/backend.md)
