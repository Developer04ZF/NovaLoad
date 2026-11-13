# SSRF Protection

## Server-Side Request Forgery Guard (`server/security.ts`, `src-tauri/src/security.rs`)
`validateDownloadUrl(rawUrl, options)` rejects:
- **Non-HTTP(S) Schemes**: Blocks `file:`, `ftp:`, `javascript:`, `data:`, `gopher:`, and custom URI handlers.
- **Embedded URL Credentials**: Rejects URLs containing `username` or `password` (`https://user:pass@host/...`).
- **Private & Reserved Hostnames**: Blocks `localhost`, `localhost.localdomain`, `*.local`, `*.internal`, and `metadata.google.internal`.
- **Private IPv4 Subnets**:
  - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (RFC-1918)
  - `127.0.0.0/8` (loopback), `0.0.0.0/8` (unspecified)
  - `169.254.0.0/16` (link-local & cloud metadata `169.254.169.254`)
  - `100.64.0.0/10` (CGNAT)
- **Private IPv6 Addresses**: `::1`, `::`, `fe80:*` (link-local), `fc*` / `fd*` (Unique Local Addresses).

## Redirect Hop Re-Validation
`DownloadManager.fetchWithSafeRedirects()` disables automatic redirects (`redirect: 'manual'`) and calls `validateDownloadUrl()` on every `Location` header across up to 5 hops—preventing public URLs from redirecting internally to localhost or cloud metadata IPs.

## Local Test Fixture Exception
Only when explicitly matching NovaLoad's active port and path prefix `/api/fixtures/` does `isLocalFixture` allow loopback access for automated testing and built-in demo fixtures.

## Related Documentation
- [Threat Model](./threat-model.md)
- [HTTP & HTTPS Transport](../download-engine/http-https.md)
