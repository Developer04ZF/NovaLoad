# Linux Packaging

## System Dependencies (Debian / Ubuntu)
Matching `.github/workflows/ci.yml` and `release.yml`:

```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  rpm
```

## Building Native Bundles
```bash
npm ci
npm run build
cd src-tauri
cargo tauri build --target x86_64-unknown-linux-gnu
```

Supported Linux targets configured in `.github/workflows/release.yml`:
- `x86_64-unknown-linux-gnu`
- `aarch64-unknown-linux-gnu`

Output formats: `.AppImage`, `.deb`, `.rpm`.

## Related Documentation
- [Production Builds Overview](./production-builds.md)
- [GitHub Actions CI/CD](./github-actions.md)
