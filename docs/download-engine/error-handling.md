# Error Handling & Diagnostics

## Diagnostic Event Trail
Every download records structured diagnostic events in SQLite (`download_events`) with severity `'info' | 'warn' | 'error' | 'success'` and ISO timestamps. View the trailing 50 events for any transfer inside the **Download Details Drawer**.

## Common Failure Causes & Messages
- **SSRF Block**: `Blocked private or reserved network host "..." (SSRF protection).` — triggered when a URL or any redirect target resolves to private/loopback/metadata IP ranges while `privacyBlockPrivateIps` is enabled.
- **Unsupported Scheme**: `Unsupported protocol "ftp:". Only HTTP and HTTPS are allowed.`
- **Embedded Credentials**: `Embedded credentials in URLs are blocked for security.`
- **Size or Checksum Mismatch**: Post-transfer size or SHA-256/SHA-512 digest differs from expected values; the corrupted `.part` file is never renamed to the clean output path.
- **Too Many Redirects**: Origin exceeded the 5-hop redirect limit.

All persisted and returned error strings pass through `redactSecrets()`.

## Related Documentation
- [Retry System](./retry-system.md)
- [SSRF Protection](../security/ssrf-protection.md)
