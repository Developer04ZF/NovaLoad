# Threat Model

## 1. Trust Boundaries
- **Untrusted Inputs**: Download URLs, HTTP redirect `Location` headers, `Content-Disposition` filenames, WebExtension messages, and structured JSON output from `@google/genai`.
- **Protected Assets**: Local filesystem outside `.novaload/downloads/`, server `GEMINI_API_KEY`, SQLite database integrity, and host internal network services.

## 2. Threat Matrix & Mitigations

| Threat Vector | Mitigation | Code Location |
| :--- | :--- | :--- |
| SSRF against loopback, RFC-1918, or cloud metadata (`169.254.169.254`) | `validateDownloadUrl()` on probe & every redirect hop | `server/security.ts`, `src-tauri/src/security.rs` |
| Directory traversal via `Content-Disposition` or AI `targetPath` | `sanitizeFilename()` + `resolveSafePath()` containment | `server/security.ts`, `server/services/fileManager.ts` |
| Silent file overwrite / destructive race | Unique `name (N).ext` naming & explicit conflict rejection | `downloadManager.ts`, `fileManager.ts` |
| Unauthorized local download injection via `/api/bridge/capture` | Required rotatable `x-novaload-token` header + URL validation | `server/app.ts` |
| Unintended filesystem mutations from LLM hallucination | Strict `Preview & Confirm` UI workflow + path containment | `geminiService.ts`, `AiAssistantView.tsx` |
| Credential leakage via logs or DB exports | `redactSecrets()` & `[REDACTED_ON_EXPORT]` | `server/security.ts`, `server/db.ts` |

## Vulnerability Disclosure
Report security issues privately per [`SECURITY.md`](../../SECURITY.md) rather than opening public GitHub issues.

## Related Documentation
- [SSRF Protection](./ssrf-protection.md)
- [Filesystem Security](./filesystem-security.md)
