# Building Bundles & Documentation Validation

## Web & Node Production Build

```bash
npm run lint
npm test
npm run build
npm run docs:validate
```

Running `npm run build` outputs static frontend assets to `dist/`, which `server.ts` serves automatically when `NODE_ENV=production`.

## Native Desktop Packaging (`src-tauri/`)
With Rust stable and OS WebView dependencies installed:

```bash
cd src-tauri
cargo tauri build
```

Refer to [Production Builds Overview](../deployment/production-builds.md) for OS-specific targets (`.exe`, `.msi`, `.AppImage`, `.deb`, `.rpm`, `.dmg`) and code signing environment variables.

## Documentation & SVG Validation
`npm run docs:validate` (`scripts/validate-docs.mjs`) checks:
- No empty documentation files exist.
- Every relative Markdown link (`[text](./path.md)` and `[text](path#anchor)`) resolves to an existing file and valid heading anchor.
- Every embedded image / SVG link resolves on disk.
- Referenced `npm run <script>` commands exist in `package.json`.
- Mermaid fences balance cleanly.
- Every `.svg` file under `assets/` parses as well-formed XML with a `viewBox` and zero `<script>` tags.

## Related Documentation
- [Production Builds Overview](../deployment/production-builds.md)
- [GitHub Actions CI/CD](../deployment/github-actions.md)
