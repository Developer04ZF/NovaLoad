# Development Environment Setup

## Toolchain Requirements
- **Node.js `>= 22.5`** (provides `node:sqlite`, native `fetch`, and `node:crypto`)
- **npm `>= 10`**
- **Optional Rust / Tauri 2**: `rustup`, `cargo`, `clippy`, `rustfmt`, plus OS WebView headers for compiling `src-tauri/`

## Initial Setup

```bash
git clone https://github.com/Developer04ZF/NovaLoad.git
cd NovaLoad
npm install
cp .env.example .env
```

Start the unified development server (`tsx server.ts` on `http://localhost:3000` with Vite middleware):

```bash
npm run dev
```

## Available `package.json` Scripts
- `npm run dev` — Starts `tsx server.ts` on port `3000` (with Vite middleware in non-production mode).
- `npm start` — Starts `tsx server.ts` directly.
- `npm run build` — Compiles the React SPA into `dist/` via Vite (`vite build`).
- `npm run lint` — Runs TypeScript type checking (`tsc --noEmit`).
- `npm test` — Runs the Vitest suite (`vitest run`).
- `npm run docs:validate` — Executes `scripts/validate-docs.mjs` verifying Markdown links, anchors, script names, and SVG XML/attributes.
- `npm run clean` — Deletes `dist` and `server.js`.

## Related Documentation
- [Repository & Project Structure](./project-structure.md)
- [Testing & Verification](./testing.md)
