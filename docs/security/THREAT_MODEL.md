# NovaLoad Threat Model & Security Controls

## 1. Trust Boundaries

- **Untrusted Inputs**: Download URLs, HTTP redirect `Location` headers, `Content-Disposition` filenames, browser extension messages, and Gemini AI JSON outputs.
- **Trusted Boundaries**: Local filesystem outside `.novaload/downloads/`, server environment secrets (`GEMINI_API_KEY`), and SQLite database integrity.

## 2. Mitigations

1. **SSRF Prevention (`server/security.ts`, `src-tauri/src/security.rs`)**:
   - Allows only `http:` and `https:` protocols.
   - Rejects URLs containing embedded usernames or passwords.
   - Blocks loopback, RFC-1918 private subnets, link-local / cloud metadata (`169.254.169.254`), `.local`, `.internal`, and IPv6 ULA (`fc00::/7`).
   - Re-validates every HTTP redirect hop.
2. **Path Traversal & Overwrite Protection**:
   - `sanitizeFilename` strips directory separators and control characters.
   - `resolveSafePath` verifies canonical relative paths never escape the managed downloads directory.
   - `FileManagerService` and `DownloadManager` never silently overwrite existing files.
3. **AI Security & Privacy**:
   - `@google/genai` runs exclusively server-side; keys are never serialized to clients or logs.
   - Only sanitized metadata is shared by default.
   - AI never executes shell commands and requires explicit user confirmation for every file action.
4. **Browser Bridge Hardening**:
   - All `/api/bridge/capture` requests must supply a matching rotatable `x-novaload-token`.
   - Captured URLs undergo full SSRF validation before enqueueing.
5. **Safe Logging**:
   - `redactSecrets` strips API keys, Bearer tokens, and bridge tokens before error persistence.
