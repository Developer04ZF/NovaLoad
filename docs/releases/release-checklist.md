# Release Checklist

Use this checklist before tagging and publishing every NovaLoad release on GitHub (`Developer04ZF/NovaLoad`).

## 1. Version & Changelog Alignment
- [ ] Bump `"version"` consistently in:
  - `package.json`
  - `package-lock.json` (`npm install --package-lock-only`)
  - `src-tauri/tauri.conf.json`
  - `src-tauri/Cargo.toml`
  - `extensions/shared/base-manifest.json` (propagated automatically via `npm run build:extensions`)
  - `CITATION.cff`
- [ ] Add dated entry `[X.Y.Z]` to `CHANGELOG.md`.

## 2. Build & Verification Gates
Run cleanly on Node.js `>= 22.5`:
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
Confirm zero failures across:
- TypeScript (`tsc --noEmit`)
- Security SSRF & path-containment tests (`tests/security.test.ts`)
- Download engine integration & persistence tests (`tests/engine.integration.test.ts`)
- Compiled sidecar E2E lifecycle tests (`tests/sidecar.test.ts`)
- Browser extension manifest & bridge tests (`tests/extensions.test.ts`)
- React UI tests (`tests/ui.test.tsx`)
- Version, extension ZIP, artifact, and Markdown/SVG validators (`validate:release`)

## 3. Signing Secrets Check (Production Public Releases)
- [ ] Confirm `TAURI_SIGNING_PUBLIC_KEY`, `TAURI_SIGNING_PRIVATE_KEY`, and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` are configured (or document release clearly as unsigned community build).
- [ ] Confirm Windows Authenticode / Apple Developer signing & notarization secrets if publishing signed native OS installers.

## 4. Tag & Publish
```bash
git add -A
git commit -m "chore(release): prepare vX.Y.Z"
git tag -a vX.Y.Z -m "NovaLoad vX.Y.Z"
git push origin main vX.Y.Z
```

## 5. Post-Release Verification
- [ ] Verify all jobs in `.github/workflows/release.yml` succeed across Windows, macOS, and Linux targets.
- [ ] Verify `SHA256SUMS.txt`, `novaload-sbom.spdx.json`, and all 4 `NovaLoad-*-Extension-vX.Y.Z.zip` files appear on the GitHub Release page.
- [ ] Download an installer on a clean machine without Node.js installed and confirm first-launch onboarding, download completion, and clean exit.

## Related Documentation
- [Building Releases](./building-releases.md)
- [Code Signing & Certificates](./code-signing.md)
