# GitHub Actions CI/CD

## Workflows (`.github/workflows/`)

1. **`ci.yml` (`CI Validation`)** — Runs on pushes and pull requests to `main`:
   - `web-and-engine`: `npm ci`, `npm run lint`, `npm run build`, `npm run build:icons`, `npm run build:extensions`, `npm run build:sidecar`, `npm test`, `npm run validate:versions`, `npm run validate:extensions`, `npm run validate:artifacts`.
   - `rust-core`: Stable Rust (`rustfmt`, `clippy`), Linux WebKitGTK headers, `npm run build:icons && npm run build:sidecar`, `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test --lib`.
   - `docs-check`: Verifies governance & `docs/releases/` files exist and executes `npm run docs:validate`.
2. **`release.yml` (`Multi-Platform Release`)** — Triggers on pushed tags matching `v*` (or `workflow_dispatch`):
   - `verify`: Confirms tag matches `package.json`, `Cargo.toml`, `tauri.conf.json`, extensions, and `CHANGELOG.md`; runs `npm run lint`, builds, `npm test`, and `npm run validate:release`.
   - `build-extensions`: Packages and verifies all 4 `NovaLoad-{Brave,Chrome,Edge,Firefox}-Extension-vX.Y.Z.zip` bundles.
   - `build-desktop`: 6-target matrix compiling per-target Node 22 SEA sidecars (`scripts/build-sidecar.mjs --target ...`) + native Tauri 2 installers via `tauri-apps/tauri-action@v0`.
   - `publish-release`: Generates `novaload-sbom.spdx.json`, builds `SHA256SUMS.txt` via `scripts/validate-artifacts.mjs --write-checksums`, verifies hashes, and publishes grouped release notes.
3. **`security-audit.yml` (`Security & Dependency Audit`)** — Weekly cron + PR checks running `npm audit --audit-level=high`, `npm run validate:versions`, and conditional `rustsec/audit-check@v2`.

## Related Documentation
- [Building Releases](../releases/building-releases.md)
- [Release Process & Signing](./release-process.md)
- [Testing & Verification](../developer-guide/testing.md)
