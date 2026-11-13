# Security Architecture

## Defense-in-Depth Layers
1. **Network / SSRF Guard (`server/security.ts`, `src-tauri/src/security.rs`)**: Blocks non-HTTP(S) URLs, embedded credentials, loopback, RFC-1918, CGNAT (`100.64.0.0/10`), link-local / cloud metadata (`169.254.0.0/16`), `.local`/`.internal`, and IPv6 ULA/loopback on both probe and every redirect hop.
2. **Filesystem Containment**: `sanitizeFilename()` strips traversal characters and Windows/POSIX illegal glyphs; `resolveSafePath()` verifies every destination stays inside `downloadsDir`; existing files are never silently overwritten.
3. **Browser Bridge Token**: `x-novaload-token` shared secret prevents untrusted local scripts from enqueueing downloads.
4. **AI Sandboxing**: Gemini cannot execute shell commands and cannot mutate files without user confirmation.
5. **Log & Export Sanitization**: `redactSecrets()` masks API keys, bridge tokens, and Bearer credentials before saving error messages or sending HTTP error JSON.

## Related Documentation
- [SSRF Protection](../security/ssrf-protection.md)
- [Filesystem Security](../security/filesystem-security.md)
- [Threat Model](../security/threat-model.md)
