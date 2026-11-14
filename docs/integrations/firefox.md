# Mozilla Firefox Setup

## Manifest Requirements (`extensions/firefox/manifest.json`)
- Self-contained Manifest V3 package with `browser_specific_settings.gecko.id = "bridge@novaload.org"` and `strict_min_version = "115.0"`.
- Bundles its own `background.js`, `popup.html`, `popup.js`, and `icons/` with zero external relative `../` references.

## Temporary Add-on Loading Steps
1. Open Mozilla Firefox (`>= 115.0`) and navigate to `about:debugging#/runtime/this-firefox`.
2. Download and extract `NovaLoad-Firefox-Extension-v1.0.0.zip` (or use `extensions/firefox/` from the repository).
3. Click **Load Temporary Add-on...** and select `manifest.json` inside the extracted Firefox directory (temporary add-ons remain active until Firefox restarts; signed `.xpi` distribution requires Mozilla AMO review).
4. Copy the active **Endpoint URL** and **Bridge Auth Token** from NovaLoad's **Browser Bridge** view into the extension popup, click **Save Settings**, and run **Test Connection**.

## Related Documentation
- [Browser Extensions Overview](./browser-extensions.md)
- [Browser Extensions Release Guide](../releases/browser-extensions.md)
- [Browser Bridge Architecture](../architecture/browser-bridge.md)
