# Mozilla Firefox Setup

## Manifest Requirements (`extensions/firefox/manifest.json`)
- Manifest V3 with `browser_specific_settings.gecko.id = "bridge@novaload.org"` and `strict_min_version = "115.0"`.
- References `../chrome-edge/background.js` and `../chrome-edge/popup.html`.

## Temporary Add-on Loading Steps
1. Open Mozilla Firefox (`>= 115.0`) and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `extensions/firefox/manifest.json` (note: temporary add-ons remain active until Firefox restarts; permanent installation requires Mozilla AMO signing).
4. Copy the **Bridge Auth Token** from NovaLoad's **Browser Bridge** view into the extension popup.

> Note: Because `extensions/firefox/manifest.json` references sibling files under `../chrome-edge/`, ensure both `extensions/firefox/` and `extensions/chrome-edge/` remain present in the same parent `extensions/` directory when loading or packaging.

## Related Documentation
- [Browser Extensions Overview](./browser-extensions.md)
- [Browser Bridge Architecture](../architecture/browser-bridge.md)
