# Building NovaLoad Releases

NovaLoad's release pipeline packages three layers into self-contained distributables:

1. **Frontend UI Bundle (`dist/`)**: Compiled by Vite (`npm run build`).
2. **Standalone Backend Sidecar (`src-tauri/binaries/novaload-server-*`)**:
   - `scripts/build-server.mjs` bundles `server.ts` and Express/Zod dependencies with `esbuild` into `build/server.cjs` (dynamically isolating `vite` dev dependencies out of production).
   - `scripts/build-sidecar.mjs` injects `build/server.cjs` into a Node.js 22 Single Executable Application (SEA) binary via `postject`, targeting the matching Rust target triple (`x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu`, `x86_64-pc-windows-msvc.exe`, `aarch64-pc-windows-msvc.exe`, `x86_64-apple-darwin`, `aarch64-apple-darwin`).
   - Built-in `node:sqlite` runs inside the standalone executable with zero external runtime requirements.
3. **Browser Extension Archives (`dist/extensions/*.zip`)**:
   - `scripts/build-extensions.mjs` builds `extensions/{brave,chrome,edge,firefox}/` cleanly from `extensions/shared/` and compresses them with built-in Node `zlib` (`deflateRawSync` + `crc32`) into:
     - `NovaLoad-Brave-Extension-v<VERSION>.zip`
     - `NovaLoad-Chrome-Extension-v<VERSION>.zip`
     - `NovaLoad-Edge-Extension-v<VERSION>.zip`
     - `NovaLoad-Firefox-Extension-v<VERSION>.zip`

## Local Build Commands

```bash
npm ci
npm run lint
npm run build
npm run build:icons
npm run build:extensions
npm run build:sidecar
npm test
npm run validate:release
```

To generate native desktop installers locally (requires Rust stable toolchain, `cargo install tauri-cli`, and OS WebView dependencies):

```bash
cd src-tauri
cargo tauri build
```

## Automated GitHub Releases Workflow (`.github/workflows/release.yml`)

Pushing a SemVer tag matching `v*` (e.g., `v1.0.0`) runs four stages:
1. **`verify`**: Confirms tag matches `package.json`, `Cargo.toml`, `tauri.conf.json`, extensions, and `CHANGELOG.md`, then executes tests, builds, and `npm run validate:release`.
2. **`build-extensions`**: Builds and verifies all 4 Manifest V3 browser extension ZIP archives.
3. **`build-desktop`**: 6-target matrix building sidecar binaries + native Tauri 2 installers for Windows, Linux, and macOS.
4. **`publish-release`**: Generates `novaload-sbom.spdx.json` (SPDX SBOM), computes `SHA256SUMS.txt`, validates all artifacts (`scripts/validate-artifacts.mjs`), and publishes grouped release notes.

## Related Documentation
- [GitHub Actions CI/CD](../deployment/github-actions.md)
- [Code Signing & Certificates](./code-signing.md)
- [Release Checklist](./release-checklist.md)
