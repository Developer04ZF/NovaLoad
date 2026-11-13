# Glossary

- **Accept-Ranges**: HTTP response header (`Accept-Ranges: bytes`) indicating the server supports partial byte-range requests (`HTTP 206`), enabling NovaLoad's multi-connection segmentation and byte-offset resume.
- **Browser Bridge**: Token-authenticated local HTTP endpoint (`POST /api/bridge/capture`) receiving download handoffs from Chrome, Edge, or Firefox Manifest V3 extensions.
- **ETag / If-Range**: HTTP entity tag used when resuming paused transfers so NovaLoad only resumes byte offsets if the remote file remained unchanged.
- **Novi**: NovaLoad's original vector mascot bot (`assets/branding/mascot/`).
- **`.part` File**: Preallocated temporary staging file (`<filePath>.part`) receiving byte-range writes until completion and cryptographic hash checks finish cleanly.
- **Preview & Confirm**: Security workflow requiring user inspection and approval before any Gemini AI file action executes on disk.
- **`resolveSafePath`**: Canonical filesystem containment guard ensuring no file path escapes NovaLoad's managed downloads folder.
- **SSRF (Server-Side Request Forgery)**: Security boundary blocking HTTP transfers targeting loopback, private subnets, or cloud metadata endpoints (`169.254.169.254`).
- **`TokenBucketPacer`**: Streaming byte-allowance rate limiter enforcing per-download, queue, and global speed limits.
- **WAL Mode**: SQLite Write-Ahead Logging mode allowing concurrent progress reads while segments update.

## Related Documentation
- [Architecture Overview](../architecture/overview.md)
- [Frequently Asked Questions](./faq.md)
