# Range Request Negotiation

## Probe Strategy (`probeUrl`)
1. Sends `HEAD` with a `12000 ms` `AbortSignal.timeout`.
2. Checks `Accept-Ranges` (`includes('bytes')`) and `Content-Length > 0`.
3. **405 / 501 Fallback**: Some CDNs and signed object URLs reject `HEAD`. When `HEAD` returns HTTP `405` or `501`, NovaLoad automatically retries with `GET` and header `Range: bytes=0-0`, cancelling the response body immediately after headers arrive:
   - On HTTP `206` with `Content-Range: bytes 0-0/<total>`, sets `totalBytes = Number(total)` and `supportsRanges = totalBytes > 0`.
   - On HTTP `200`, reads `Content-Length` and marks `supportsRanges = false`.

## Safe Multi-Connection Threshold
Even when `supportsRanges` is true, files smaller than `65536` bytes (64 KB) use a single connection (`actualConnections = 1`) to avoid redundant socket handshake overhead.

## Related Documentation
- [Segmented Downloads](./segmented-downloads.md)
- [Pause & Resume Mechanism](./resume-mechanism.md)
