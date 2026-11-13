# Repository & Project Structure

## Directory Map

```text
NovaLoad/
├── server.ts                  # HTTP bootstrap, Vite dev middleware, graceful shutdown
├── server/
│   ├── app.ts                 # Express routes, SSE /api/events, Zod validation
│   ├── db.ts                  # node:sqlite DAL, migrations, defaults, recovery
│   ├── security.ts            # SSRF guard, sanitizeFilename, resolveSafePath, redaction
│   ├── engine/
│   │   └── downloadManager.ts # Multi-connection Range engine, queues, scheduler, hashing
│   ├── routes/
│   │   └── fixtures.ts        # Deterministic local HTTP test fixtures (/api/fixtures/*)
│   └── services/
│       ├── fileManager.ts     # Disk scan, SHA-256 duplicates, safe action execution
│       ├── mediaService.ts    # Direct container & .m3u8 media probe
│       └── geminiService.ts   # Optional server-side @google/genai file organizer
├── src/
│   ├── App.tsx                # Navigation shell, SSE listener, theme & RTL sync
│   ├── shared/types.ts        # Shared TypeScript interfaces across client & server
│   ├── lib/                   # API client, formatting helpers, EN/FA/AR translations
│   └── components/            # Modular UI views & inline SVG brand components
├── cli/novaload.ts            # Companion terminal CLI talking to NovaLoad REST API
├── extensions/
│   ├── chrome-edge/           # Manifest V3 Chrome & Microsoft Edge extension
│   └── firefox/               # Manifest V3 Firefox WebExtension manifest
├── src-tauri/                 # Tauri 2 desktop config & Rust engine/security modules
├── assets/                    # Brand logos, Novi mascot poses, animations, illustrations, icons
├── docs/                      # Categorized documentation knowledge base
├── scripts/validate-docs.mjs  # Automated Markdown & SVG integrity validator
└── tests/                     # Security unit, engine integration, and React UI tests
```

## Related Documentation
- [Architecture Overview](../architecture/overview.md)
- [Coding Standards](./coding-standards.md)
