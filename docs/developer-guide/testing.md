# Testing & Verification

## Test Suites (`tests/`)
NovaLoad runs Vitest (`vitest.config.ts`) across three test suites:
- **`tests/security.test.ts`**: Unit tests verifying SSRF private/loopback/metadata blocking, protocol checks, embedded credentials rejection, `sanitizeFilename`, `resolveSafePath` containment, and `redactSecrets`.
- **`tests/engine.integration.test.ts`**: End-to-end integration tests exercising `/api/fixtures/*`, multi-connection Range download + SHA-256 verification, single-stream fallback, browser bridge auth (`401`/`201`), path traversal rejection on `/api/files/execute-actions`, and pause/resume persistence.
- **`tests/ui.test.tsx`**: React Testing Library + JSDOM UI rendering checks for `App.tsx`, empty states, and navigation tabs.

## Verification Commands

```bash
# Type check TypeScript across client & server
npm run lint

# Run unit, integration, and UI tests
npm test

# Build production Vite bundle
npm run build

# Validate Markdown links, anchors, scripts, and SVGs
npm run docs:validate
```

If Rust toolchains are installed locally:

```bash
cd src-tauri && cargo fmt --check && cargo test --lib
```

## Related Documentation
- [Debugging & Local Fixtures](./debugging.md)
- [GitHub Actions CI/CD](../deployment/github-actions.md)
