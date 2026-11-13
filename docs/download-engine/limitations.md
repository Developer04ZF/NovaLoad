# Engine Scope & Limitations

## Supported & Verified
- HTTP/1.1 and HTTPS `GET`/`HEAD` transfers
- `Accept-Ranges: bytes` multi-connection partitioning (`1..16` segments)
- `ETag` + `If-Range` conditional resume
- Single-stream fallback for non-range or chunked/unknown-length origins
- Direct media streams and open `.m3u8` variant playlist resolution

## Not Currently Supported
- **DRM / Encrypted Media**: No Widevine, FairPlay, PlayReady, or key-extraction bypasses.
- **Non-HTTP Protocols**: No FTP/SFTP, BitTorrent, Magnet links, eDonkey, or custom cloud storage SDK protocols.
- **HLS Segment Muxing / FFmpeg Transcoding**: Media probing inspects direct MP4/WebM/MP3 sources and `.m3u8` variant URLs, enqueueing the selected URL through the standard HTTP download engine; NovaLoad does not invoke `ffmpeg` at runtime to remux `.ts` playlists.
- **Dynamic HTML Auth / Login Walls**: Pages requiring interactive browser sessions or CAPTCHAs cannot be scraped automatically.

## Related Documentation
- [Known Limitations](../reference/known-limitations.md)
- [Adding Download Protocols](../developer-guide/adding-download-protocols.md)
