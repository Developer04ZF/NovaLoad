# Testing & Verification

## Test Suites (`tests/`)
NovaLoad runs Vitest (`vitest.config.ts`) across five test suites:
- **`tests/security.test.ts`**: Unit tests verifying SSRF private/loopback/metadata/`::ffff:` IPv4-mapped IPv6 blocking, protocol checks, embedded credentials rejection, async DNS-rebinding rejection (`validateDownloadUrlWithDns`), `sanitizeFilename`, `resolveSafePath`/`resolveSafeRealPath` symlink containment, and `redactSecrets` (`nl_bridge_` + `nl_local_`).
- **`tests/engine.integration.test.ts`**: End-to-end integration tests exercising `/api/fixtures/*`, multi-connection Range download + SHA-256 verification, Range-ignored HTTP 200 consolidation, `0`-byte completion, truncated stream cleanup, flaky 503 auto-retry, 302 private-IP redirect SSRF blocking, single-stream fallback, desktop `localApiToken` + strict CORS, `/api/files/execute-actions` path safety, and pause/resume persistence.
- **`tests/extensions.test.ts`**: Validates self-contained Manifest V3 files and ZIP packages for Brave, Chrome, Edge, and Firefox alongside `/api/bridge/ping` and `/api/bridge/capture`.
- **`tests/sidecar.test.ts`**: Spawns the compiled standalone Node 22 SEA `novaload-server` executable, verifies dynamic localhost binding, `NOVALOAD_READY`, `localApiToken` enforcement, real file download, and clean exit via `stdin` EOF (`NOVALOAD_STDIN_WATCHDOG=1`).
- **`tests/ui.test.tsx`**: React Testing Library + JSDOM UI rendering checks for `App.tsx`, empty states, and navigation tabs.

## Verification Commands

```bash
# Type check TypeScript across client & server
npm run lint

# Build SPA, desktop icons, browser extension ZIPs, and standalone backend sidecar
npm run build
npm run build:icons
npm run build:extensions
npm run build:sidecar

# Run all unit, integration, extension, sidecar E2E, and UI tests
npm test

# Validate versions, extension ZIPs, artifacts, and Markdown/SVG docs
npm run validate:release
```

If Rust toolchains are installed locally:

```bash
cd src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test --lib
```

## Related Documentation
- [Debugging & Local Fixtures](./debugging.md)
- [GitHub Actions CI/CD](../deployment/github-actions.md)
- [Release Checklist](../releases/release-checklist.md)
