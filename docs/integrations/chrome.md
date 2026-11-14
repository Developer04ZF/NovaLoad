# Google Chrome Setup

## Loading the Extension
1. Launch the NovaLoad desktop app (or start source server via `npm run dev`).
2. In NovaLoad, open **System → Browser Bridge** and copy your active **Endpoint URL** and **Bridge Auth Token** (`nl_bridge_...`).
3. Download and extract `NovaLoad-Chrome-Extension-v1.0.0.zip` from GitHub Releases (or use `extensions/chrome/` from the repository).
4. Open Google Chrome and navigate to `chrome://extensions`.
5. Enable **Developer mode** (top-right toggle).
6. Click **Load unpacked** and select the extracted `chrome` folder.
7. Pin **NovaLoad Download Bridge**, click its toolbar icon, paste your Endpoint URL and token, click **Save Settings**, and verify with **Test Connection**.

## Usage
- Right-click any download link, `<video>`, or `<audio>` element and choose **Download with NovaLoad**.
- Optionally enable **Auto-Intercept** inside the popup to cancel browser-native HTTP/HTTPS downloads and route them into NovaLoad automatically.

## Troubleshooting
- **`401 Invalid NovaLoad browser bridge token`**: Re-copy the active token from **Browser Bridge** (or click **Rotate Token** and re-paste).
- **`403 Browser bridge is disabled`**: Toggle **Browser Bridge Enabled** on in NovaLoad settings.

## Related Documentation
- [Browser Extensions Overview](./browser-extensions.md)
- [Browser Extensions Release Guide](../releases/browser-extensions.md)
- [Microsoft Edge Setup](./edge.md)
