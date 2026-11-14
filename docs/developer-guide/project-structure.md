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
│   ├── shared/                # Shared MV3 background worker, popup, and manifest generator templates
│   ├── brave/                 # Self-contained Brave MV3 package
│   ├── chrome/                # Self-contained Google Chrome MV3 package
│   ├── edge/                  # Self-contained Microsoft Edge MV3 package
│   └── firefox/               # Self-contained Mozilla Firefox MV3 package
├── src-tauri/                 # Tauri 2 desktop config, embedded sidecar runner & Rust modules
├── assets/                    # Brand logos, Novi mascot poses, animations, illustrations, icons
├── docs/                      # Categorized documentation knowledge base (including docs/releases/)
├── scripts/                   # Sidecar, icon, extension ZIP, version, artifact & docs validators
└── tests/                     # Security, engine integration, sidecar E2E, extension & UI tests
```

## Related Documentation
- [Architecture Overview](../architecture/overview.md)
- [Coding Standards](./coding-standards.md)
