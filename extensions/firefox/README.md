# NovaLoad Browser Extension — Mozilla Firefox (v1.0.0)

## Package Contents
Self-contained Firefox Manifest V3 WebExtension (`manifest.json`, `background.js`, `popup.html`, `popup.js`, `icons/`).

## Temporary Unpacked Installation (Development / Immediate Use)
1. Launch NovaLoad Desktop (or local server) and open **Browser Bridge** to copy your **Handoff Endpoint** and **Pairing Token** (`nl_bridge_...`).
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on...**.
4. Select `manifest.json` inside the extracted folder (or select the `.zip` archive directly).
5. Click the NovaLoad toolbar icon, paste your Endpoint + Token, and click **Test Connection**.

> **Firefox Signing Note**: Unlisted/temporary unsigned XPI/ZIP bundles are accepted via `about:debugging` (or Firefox Developer Edition / Nightly with `xpinstall.signatures.required=false`). Permanent standard Firefox release installation requires signed distribution through Mozilla Add-ons (AMO).
