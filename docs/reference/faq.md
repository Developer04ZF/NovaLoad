# Frequently Asked Questions

### Does NovaLoad require a Gemini API key to download files?
**No.** All downloading, multi-connection segmentation, pause/resume, queues, scheduling, SHA-256/512 verification, file inspection, browser extensions, and CLI features work 100% locally without `GEMINI_API_KEY`.

### Why did a multi-connection download use only 1 connection?
Servers only support parallel segmentation when they return `Accept-Ranges: bytes` and `Content-Length >= 65536` bytes. Otherwise, NovaLoad automatically falls back to a safe single stream so the file is never corrupted.

### Can resuming a paused transfer corrupt a file if the remote file changed?
For Range-capable servers, NovaLoad sends `If-Range: <etag>` captured during initial probing. If the origin `ETag` changed, the server returns `200 OK` instead of `206 Partial Content`, preventing stale byte concatenation.

### Why are `127.0.0.1` or `169.254.169.254` URLs blocked?
SSRF protection (`privacyBlockPrivateIps: true`) blocks private subnets, loopback interfaces, and cloud metadata IPs by default across both probes and redirects. The only permitted loopback exception is NovaLoad's deterministic fixture router (`/api/fixtures/*`).

### Where is my download database stored?
Under `NOVALOAD_DATA_DIR/novaload.db` (default `.novaload/novaload.db`), managed by Node's built-in `node:sqlite` engine in WAL mode.

### Does Gemini AI delete or move files automatically?
**No.** Gemini only receives sanitized metadata and proposes a structured JSON plan displayed in a Preview & Confirm UI checklist. Files only move or delete after you explicitly approve actions.

## Related Documentation
- [Glossary](./glossary.md)
- [Known Limitations](./known-limitations.md)
- [Troubleshooting](../deployment/troubleshooting.md)
