# Known Limitations

Being explicit about boundaries prevents surprise failures:

1. **HTTP/HTTPS Only**: Non-HTTP protocols (FTP, SFTP, BitTorrent, Magnet) are blocked intentionally by `validateDownloadUrl()`.
2. **No DRM Bypass**: `MediaService` does not decrypt Widevine/PlayReady/FairPlay streams or bypass authentication/paywalls.
3. **Direct Stream Media Probing**: `MediaService` inspects direct video/audio streams and open `.m3u8` variant playlists, queueing selected streams as standard HTTP downloads rather than running server-side `ffmpeg` segment muxing.
4. **Native Desktop Packaging Requires Local/CI Toolchains**: Running in a Node-only container supports full web/API/CLI functionality (`npm run dev`), whereas compiling `src-tauri/` native installers requires Rust (`cargo`), Tauri CLI, and OS WebView SDKs.
5. **Pre-Built Unsigned vs. Signed Releases**: Public signed desktop installers require repository signing certificates during CI tag builds (`v*`).
6. **Live UI Screenshots**: Headless container environments lacking Chromium/Playwright cannot capture real browser screenshots cleanly; see `assets/screenshots/README.md` for capture guidelines.

## Related Documentation
- [Engine Scope & Limitations](../download-engine/limitations.md)
- [Supported Platforms Matrix](./supported-platforms.md)
