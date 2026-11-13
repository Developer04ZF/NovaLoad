# Microsoft Edge Setup

## Loading the Unpacked Extension
1. Ensure NovaLoad is running on `http://127.0.0.1:3000` and copy your **Bridge Auth Token** from **Browser Bridge**.
2. Open Microsoft Edge and navigate to `edge://extensions`.
3. Enable **Developer mode** in the left sidebar.
4. Click **Load unpacked** and choose the `extensions/chrome-edge/` directory.
5. Open the **NovaLoad Download Bridge** popup, paste the auth token, and optionally toggle **Auto-Intercept**.

`extensions/chrome-edge/background.js` automatically detects Edge (`navigator.userAgent.includes('Edg/')`) so recent bridge captures show `browser: "edge"` inside NovaLoad's bridge audit log.

## Related Documentation
- [Browser Extensions Overview](./browser-extensions.md)
- [Google Chrome Setup](./chrome.md)
