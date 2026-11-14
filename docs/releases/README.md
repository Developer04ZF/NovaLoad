# NovaLoad Releases Guide

Welcome to the release engineering and end-user distribution guide for **NovaLoad** (`https://github.com/Developer04ZF/NovaLoad/releases`).

## Distribution Philosophy

A desktop user should be able to install and launch NovaLoad without manually installing Node.js, running `npm run dev`, or configuring environment variables.

To achieve this cleanly:
- **Desktop Installers (Tauri 2 + Embedded Sidecar)**: Each platform installer bundles the compiled React UI (`dist/`), native Rust desktop shell (`src-tauri/`), OS icons, and the standalone compiled `novaload-server` executable (`build/server.cjs` packaged via Node.js Single Executable Application tooling). On startup, Tauri automatically spawns `novaload-server --desktop --port 0 --host 127.0.0.1 --data-dir <app_data_dir>`, discovers its random port and per-session `nl_local_*` auth token, waits for readiness, and cleanly shuts down the backend and active transfers on exit.
- **Browser Extensions (Manifest V3 ZIPs)**: Self-contained browser packages (`NovaLoad-{Brave,Chrome,Edge,Firefox}-Extension-v1.0.0.zip`) ship with dedicated manifests, service worker/background scripts, `Test Connection` diagnostics, icons, and dynamic localhost port configuration (`http://127.0.0.1/*`).
- **Verification & Transparency**: Every release attaches `SHA256SUMS.txt` and `novaload-sbom.spdx.json`. Signed binaries vs unsigned community CI builds are disclosed transparently.

## Release Documentation Index

- [Platform Support Matrix](./platform-support.md) — Supported desktop architectures, installer formats, and browser versions.
- [Building Releases](./building-releases.md) — How standalone sidecars, extension ZIPs, and 6-target Tauri installers are built.
- [Browser Extensions Distribution](./browser-extensions.md) — Installing release ZIPs in Brave, Chrome, Edge, and Firefox.
- [Code Signing & Certificates](./code-signing.md) — Tauri Ed25519 updater keys, Windows Authenticode, macOS notarization, and browser stores.
- [Updating NovaLoad](./updating.md) — Signature-verified updater workflow, manual upgrades, and SQLite safety.
- [Release Checklist](./release-checklist.md) — Step-by-step validation gates before pushing a release tag.
