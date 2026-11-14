# Microsoft Edge Setup

## Loading the Extension
1. Launch NovaLoad and copy your active **Endpoint URL** and **Bridge Auth Token** (`nl_bridge_...`) from **Browser Bridge**.
2. Download and extract `NovaLoad-Edge-Extension-v1.0.0.zip` (or use `extensions/edge/` from the repository).
3. Open Microsoft Edge and navigate to `edge://extensions`.
4. Enable **Developer mode** in the left sidebar.
5. Click **Load unpacked** and choose the `edge` directory.
6. Open the **NovaLoad Download Bridge** popup, paste the endpoint and auth token, click **Save Settings**, click **Test Connection**, and optionally toggle **Auto-Intercept**.

`extensions/edge/background.js` identifies browser requests from Edge cleanly so recent bridge captures show `browser: "edge"` inside NovaLoad's bridge audit log.

## Related Documentation
- [Browser Extensions Overview](./browser-extensions.md)
- [Browser Extensions Release Guide](../releases/browser-extensions.md)
- [Google Chrome Setup](./chrome.md)
