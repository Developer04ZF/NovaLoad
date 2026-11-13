# GitHub Actions CI/CD

## Workflows (`.github/workflows/`)

1. **`ci.yml` (`CI Validation`)** — Runs on pushes and pull requests to `main`:
   - `web-and-engine`: Node 22 setup, `npm ci`, `npm run lint`, `npm test`, `npm run build`.
   - `rust-core`: Stable Rust (`rustfmt`, `clippy`), Linux WebKitGTK headers, `cargo fmt --check`, `cargo test --lib`.
   - `docs-check`: Verifies core governance files (`README.md`, `LICENSE`, `SECURITY.md`, `THIRD_PARTY_LICENSES.md`, `docs/README.md`) and executes `npm run docs:validate`.
2. **`release.yml` (`Multi-Platform Release`)** — Triggers on pushed tags matching `v*`:
   - `verify`: Runs `npm ci`, `npm run lint`, `npm test`.
   - `build-desktop`: 6-target matrix across Windows (`x64`, `ARM64`), Linux (`x64`, `ARM64`), and macOS (`aarch64`, `x86_64`) via `tauri-apps/tauri-action@v0` producing draft releases.
   - `sbom-and-checksums`: Generates `novaload-sbom.spdx.json` using `anchore/sbom-action@v0`.

## Related Documentation
- [Release Process & Signing](./release-process.md)
- [Testing & Verification](../developer-guide/testing.md)
