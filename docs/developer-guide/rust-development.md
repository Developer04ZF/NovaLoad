# Rust & Tauri Development

## Crate Overview (`src-tauri/`)
- `src-tauri/Cargo.toml`: Configures Tauri 2, `tauri-plugin-notification`, `tauri-plugin-updater`, `reqwest`, `tokio`, `sha2`, `hex`, `keyring`, and `url`.
- `src-tauri/src/lib.rs`: System tray initialization and Tauri commands (`validate_url_command`, `store_secret_in_keyring`, `delete_secret_from_keyring`).
- `src-tauri/src/engine.rs`: `split_segments`, `download_segment_to_file`, and `sha256_file`.
- `src-tauri/src/security.rs`: `is_private_ip`, `validate_download_url`, and `resolve_safe_path`.

## Running Rust Checks Locally
When Rust and OS WebView development packages are installed:

```bash
cd src-tauri
cargo fmt --check
cargo test --lib
```

These exact commands run automatically in CI under `.github/workflows/ci.yml` (`rust-core` job).

## Related Documentation
- [Tauri 2 Desktop Integration](../architecture/tauri-integration.md)
- [GitHub Actions CI/CD](../deployment/github-actions.md)
