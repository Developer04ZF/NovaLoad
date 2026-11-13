# API & CLI Integration

## Companion CLI (`cli/novaload.ts`)
NovaLoad includes a zero-config TypeScript CLI talking to the running REST API (`NOVALOAD_API_URL`, defaulting to `http://127.0.0.1:3000`):

```bash
# Check engine health and version
npx tsx cli/novaload.ts version

# Enqueue a multi-connection download
npx tsx cli/novaload.ts download https://example.org/archive.tar.gz --connections 8

# Inspect downloads and queues
npx tsx cli/novaload.ts list
npx tsx cli/novaload.ts queue

# Lifecycle control
npx tsx cli/novaload.ts pause <DOWNLOAD_ID>
npx tsx cli/novaload.ts resume <DOWNLOAD_ID>
npx tsx cli/novaload.ts cancel <DOWNLOAD_ID>
```

## Direct REST / SSE Consumption
External local automation scripts can integrate directly via HTTP JSON (`GET /api/snapshot`, `POST /api/downloads`, `GET /api/events`) without scraping the UI. Refer to [REST & SSE API Reference](../developer-guide/api-reference.md) for all endpoints and schemas.

## Related Documentation
- [REST & SSE API Reference](../developer-guide/api-reference.md)
- [Environment Variables Reference](../reference/environment-variables.md)
