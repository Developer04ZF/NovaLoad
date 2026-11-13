# Release Process & Signing

## Preparing a Release
1. Update version metadata in `package.json`, `src-tauri/tauri.conf.json`, `CHANGELOG.md`, and `CITATION.cff`.
2. Run all verification gates locally:
   ```bash
   npm run lint
   npm test
   npm run build
   npm run docs:validate
   ```
3. Commit release notes and push an annotated tag:
   ```bash
   git tag -a v1.0.0 -m "NovaLoad v1.0.0"
   git push origin v1.0.0
   ```
4. `.github/workflows/release.yml` builds draft installers across all 6 OS/arch targets and attaches `novaload-sbom.spdx.json`.

## Signing Secrets Required for Verified Releases
Never claim installers are signed unless the following secrets are configured in GitHub Actions:
- **Tauri Updater**: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- **Windows**: `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`
- **macOS**: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`

## Related Documentation
- [GitHub Actions CI/CD](./github-actions.md)
- [Deployment Troubleshooting](./troubleshooting.md)
