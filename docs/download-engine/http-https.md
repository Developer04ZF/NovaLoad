# HTTP & HTTPS Transport

## Redirect & Scheme Handling
`fetchWithSafeRedirects()` uses Node's built-in `fetch()` with `{ redirect: 'manual' }` across up to `5` hops:
- Only `http:` and `https:` protocols are accepted.
- Each `Location` target is resolved against the previous URL (`new URL(location, currentUrl)`) and re-checked through `validateDownloadUrl()` before following.
- Exceeding 5 redirects or receiving a 3xx status without a `Location` header aborts with an explicit error.

## Filename Extraction Precedence
`extractFilenameFromHeaders()` determines the default filename in order:
1. Explicit caller override (`input.filename`, sanitized through `sanitizeFilename()`)
2. `Content-Disposition` `filename*=UTF-8''...` (percent-decoded & sanitized)
3. `Content-Disposition` `filename="..."`
4. URL pathname basename
5. Fallback `download_<timestamp>.bin`

## Related Documentation
- [Range Request Negotiation](./range-requests.md)
- [SSRF Protection](../security/ssrf-protection.md)
