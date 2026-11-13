# Third-Party Licenses Inventory

NovaLoad builds on open-source libraries. Direct dependencies and their upstream licenses are listed below:

## JavaScript / TypeScript Dependencies

| Package | License | Usage |
| :--- | :--- | :--- |
| `react`, `react-dom` | MIT | Desktop & web UI rendering |
| `vite`, `@vitejs/plugin-react` | MIT | Frontend bundler and dev middleware |
| `tailwindcss`, `@tailwindcss/vite` | MIT | Utility CSS styling system |
| `express` | MIT | Local HTTP engine API & SSE server |
| `lucide-react` | ISC | Standard interface affordance icons |
| `@google/genai` | Apache-2.0 | Optional server-side Gemini AI client |
| `zod` | MIT | Runtime payload and schema validation |
| `dotenv` | BSD-2-Clause | Local environment variable loading |
| `motion` | MIT | Reduced-motion-aware UI transitions |
| `vitest`, `@testing-library/react` | MIT | Automated test suite |

## Rust / Tauri Desktop Dependencies (`src-tauri/Cargo.toml`)

| Crate | License | Usage |
| :--- | :--- | :--- |
| `tauri`, `tauri-plugin-notification`, `tauri-plugin-updater` | Apache-2.0 OR MIT | Cross-platform desktop shell, tray, notifications, signed updater |
| `tokio` | MIT | Async runtime |
| `reqwest` | Apache-2.0 OR MIT | HTTP/HTTPS client with `rustls-tls` |
| `rusqlite` | MIT | Embedded SQLite storage |
| `sha2`, `hex` | Apache-2.0 OR MIT | SHA-256 / SHA-512 checksum computation |
| `serde`, `serde_json` | Apache-2.0 OR MIT | Serialization |
| `keyring` | Apache-2.0 OR MIT | OS secure credential storage |
| `url` | Apache-2.0 OR MIT | RFC-3986 URL parsing |

Run `npm audit` and `cargo deny check licenses` in CI (`.github/workflows/security-audit.yml`) to verify transitive dependency licenses prior to release.
