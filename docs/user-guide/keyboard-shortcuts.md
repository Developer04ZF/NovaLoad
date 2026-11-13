# Keyboard Shortcuts & Navigation

## Implemented Global Shortcuts
- **`Escape`**: Closes any open modal (`AddDownloadModal`), inspection drawer (`DownloadDetailsDrawer`), or mobile navigation drawer (`src/App.tsx`).
- **`Tab` / `Shift+Tab`**: Standard sequential keyboard focus traversal across sidebar navigation, transfer rows, action buttons, and dialog inputs with visible focus outlines.

## Quick Actions
- **Top Bar Theme Button**: Toggles between Dark and Light modes immediately (`PUT /api/settings`).
- **Sidebar Mobile Toggle**: Expands or collapses the slide-over navigation drawer on smaller viewports (`< lg`).

## Accessibility Note
All status controls use real `<button>` elements with explicit labels and visible focus styling rather than clickable `<div>` containers.

## Related Documentation
- [Accessibility & RTL Support](../design/accessibility.md)
- [Dashboard & Telemetry](./dashboard.md)
