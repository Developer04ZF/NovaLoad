# Application Screenshots

This directory holds real captured screenshots of the running NovaLoad interface.

## Planned Capture Inventory

| Filename | View / State | Status |
| :--- | :--- | :--- |
| `dashboard-dark.png` | Main Dashboard with live bandwidth telemetry (Dark theme) | Pending capture in desktop browser |
| `dashboard-light.png` | Main Dashboard & Quick Actions (Light theme) | Pending capture in desktop browser |
| `downloads-table.png` | All Downloads table view with multi-connection progress | Pending capture in desktop browser |
| `segment-inspector.png` | Download Details Drawer showing live byte-range segments & SHA-256 verification | Pending capture in desktop browser |
| `ai-preview-confirm.png` | Gemini AI Assistant preview-and-confirm action plan dialog | Pending capture in desktop browser |

## Why Screenshots Are Not Pre-Populated

This documentation update was authored inside a headless Linux container without Chromium, Playwright, or a display server installed. Per NovaLoad repository policy, fake mockups or fabricated screenshots are never committed as application screenshots.

## Capturing Real Screenshots

1. Start NovaLoad locally:
   ```bash
   npm install
   npm run dev
   ```
2. Open `http://localhost:3000` at `1440×900`.
3. Trigger a verification transfer from **Add Download** -> **Quick verification samples** so live segment progress and bandwidth telemetry appear naturally.
4. Save PNG captures into `assets/screenshots/` matching the table above.
