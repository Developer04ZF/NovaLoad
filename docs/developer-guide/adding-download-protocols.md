# Adding Download Protocols

## Current Scope
Today, `DownloadManager` (`server/engine/downloadManager.ts`) supports `http:` and `https:` protocols exclusively and enforces this boundary inside `validateDownloadUrl()` (`server/security.ts`).

## Guidelines for Future Protocol Providers
If adding an optional protocol provider (such as FTP/SFTP or Metalink):
1. Register the provider descriptor inside `plugins` (`server/db.ts`) with explicit network/filesystem permission scopes (`network:<protocol>`, `fs:write-downloads`) and keep it opt-in/toggleable.
2. Preserve strict SSRF protections so protocol handlers never open connections to loopback, link-local, metadata, or RFC-1918 addresses unless explicitly configured for local testing.
3. Preserve `.part` staging, `resolveUniqueDestination()`, `sanitizeFilename()`, and post-transfer SHA-256 / SHA-512 verification.
4. Keep `DownloadSegment` state persistence compatible with SQLite crash recovery.

## Related Documentation
- [Engine Scope & Limitations](../download-engine/limitations.md)
- [Security Model](../security/security-model.md)
