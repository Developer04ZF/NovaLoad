# Contributing to NovaLoad

Thank you for helping improve NovaLoad!

## Development Workflow

1. Fork the repository and create a branch from `main` (`feat/short-name` or `fix/short-name`).
2. Install dependencies: `npm install`.
3. Run the development server: `npm run dev`.
4. Run all verification checks before opening a PR:
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `cd src-tauri && cargo test` (when modifying Rust modules)

## Coding Standards

- TypeScript strict types; no `any` escapes in core engine or security modules.
- Every UI control must perform a real operation; respect WCAG AA contrast and `prefers-reduced-motion`.
- Never commit API keys, signing keys, or user credentials.
- Any feature modifying user files on disk must pass `resolveSafePath` containment and require user confirmation.

## Pull Request Checklist

- [ ] Added or updated unit/integration tests for new behavior.
- [ ] Updated relevant documentation under `docs/`.
- [ ] Confirmed `npm test` and `npm run lint` pass cleanly.
