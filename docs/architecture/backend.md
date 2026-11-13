# Express Backend & SSE Stream

## Entry & Composition
- `server.ts` handles HTTP port binding, Vite middleware / static serving, and clean shutdown.
- `server/app.ts` exposes `createServerApp(options)` so tests (`tests/engine.integration.test.ts`) can instantiate isolated app + temp SQLite instances with custom ports or disabled timers.

## Validation & Error Redaction
- Request payloads for creating downloads validate against Zod schemas (`createDownloadSchema`).
- Returned errors pass through `redactSecrets()` (`server/security.ts`) so API keys, bridge tokens, or Bearer tokens never leak in HTTP responses.

## Server-Sent Events (`/api/events`)
- Sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and sends initial `snapshot`.
- Subscribes to `downloadManager.on('snapshot', ...)` while active, emits `: keepalive` comments every `15000 ms`, and cleans up listener subscriptions on client disconnect.

## Related Documentation
- [REST & SSE API Reference](../developer-guide/api-reference.md)
- [Download Engine Internals](./download-engine.md)
