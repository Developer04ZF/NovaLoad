# Secrets Management

## Principles
- **Zero Client-Side API Keys**: `GEMINI_API_KEY` is read strictly on the Node.js server (`process.env.GEMINI_API_KEY`) inside `server/services/geminiService.ts`. It never uses a `VITE_` prefix and is never included in `/api/snapshot` or `/api/settings`.
- **Native OS Keyring Commands**: For desktop builds, `src-tauri/src/lib.rs` provides `store_secret_in_keyring` and `delete_secret_from_keyring` backed by the `keyring` crate (Windows Credential Manager, Linux Secret Service, macOS Keychain).
- **Rotatable Local Bridge Token**: `browserBridgeToken` (`nl_bridge_<random-36-hex>`) is generated via `crypto.randomBytes(18)`, masked in `GET /api/bridge/status` (`nl_bridge_...…`), and redacted to `[REDACTED_ON_EXPORT]` in `GET /api/database/export`.
- **Log Redaction (`redactSecrets`)**: Strips `AIza...`, `nl_bridge_...`, and `Bearer ...` strings before persisting download failure messages or returning HTTP errors.

## Related Documentation
- [Environment Variables Reference](../reference/environment-variables.md)
- [Gemini AI Configuration](../integrations/gemini-ai.md)
