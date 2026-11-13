# Google Chrome Setup

## Loading the Unpacked Extension
1. Start NovaLoad (`npm run dev` or production mode) so the bridge runs on `http://127.0.0.1:3000`.
2. In NovaLoad, open **System → Browser Bridge** and copy your **Bridge Auth Token**.
3. Open Google Chrome and navigate to `chrome://extensions`.
4. Enable **Developer mode** (top-right toggle).
5. Click **Load unpacked** and select the `extensions/chrome-edge/` folder from the repository.
6. Pin **NovaLoad Download Bridge**, click its toolbar icon, paste your token, and save.

## Usage
- Right-click any download link, `<video>`, or `<audio>` element and choose **Download with NovaLoad**.
- Optionally enable **Auto-Intercept** inside the popup to cancel browser-native HTTP/HTTPS downloads and route them into NovaLoad automatically.

## Troubleshooting
- **`401 Invalid NovaLoad browser bridge token`**: Re-copy the active token from **Browser Bridge** (or click **Rotate Token** and re-paste).
- **`403 Browser bridge is disabled`**: Toggle **Browser Bridge Enabled** on in NovaLoad settings.

## Related Documentation
- [Browser Extensions Overview](./browser-extensions.md)
- [Microsoft Edge Setup](./edge.md)
