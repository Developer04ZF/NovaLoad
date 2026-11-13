# Your First Download & Integrity Check

## Purpose
Walk through adding a transfer, inspecting parallel byte-range segments, testing pause/resume, and verifying the resulting SHA-256 checksum.

## Step 1: Launch NovaLoad
Start the server (`npm run dev`) and open `http://localhost:3000`.

## Step 2: Add a Download via UI
1. Click **Add Download** in the top bar.
2. Paste an `http://` or `https://` URL. For offline or sandbox verification, NovaLoad provides deterministic local fixtures, such as:
   `http://127.0.0.1:3000/api/fixtures/file/novaload-linux-x64.tar.gz`
3. Click **Inspect URL** (`POST /api/downloads/probe`) to view:
   - Resolved filename and MIME type
   - Total size (`Content-Length`)
   - Whether `Accept-Ranges: bytes` is advertised (`supportsRanges`)
   - Suggested destination category
4. Choose segment connections (`1..16`, default `6`) and optionally paste an expected SHA-256 or SHA-512 digest.
5. Click **Start Download**.

## Step 3: Inspect Segments & Events
Click the filename in the Dashboard or **All Downloads** list to open the **Download Details Drawer**:
- View per-segment progress bars (`startByte..endByte`, active/paused/completed state, and speed).
- Pause (`POST /api/downloads/:id/pause`) and resume (`POST /api/downloads/:id/start`) to verify persisted byte offsets.
- Inspect the `Actual SHA-256` and `Actual SHA-512` digests computed automatically on completion.

## Step 4: Repeat via the Companion CLI
With NovaLoad running on port `3000`:

```bash
npx tsx cli/novaload.ts download http://127.0.0.1:3000/api/fixtures/file/novaload-linux-x64.tar.gz --connections 6
npx tsx cli/novaload.ts list
```

## Related Documentation
- [Managing Downloads](../user-guide/downloads.md)
- [Multi-Connection Acceleration](../user-guide/multi-connection.md)
- [Cryptographic Integrity Verification](../download-engine/integrity-verification.md)
