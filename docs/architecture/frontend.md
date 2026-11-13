# React Frontend Architecture

## Technology & Structure
- **Framework**: React 19 (`src/main.tsx`, `src/App.tsx`) + Vite 8 + TypeScript
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss";` in `src/index.css`) with synchronized `.dark` class switching and `dir="rtl" | "ltr"` attribute management.
- **Icons & Motion**: `lucide-react` UI icons paired with `motion` and custom inline SVG brand/mascot components (`src/components/svg/NovaLogo.tsx`, `NoviMascot.tsx`, `NovaIllustrations.tsx`).

## State & Real-Time Synchronization
`App.tsx` maintains a single `DashboardSnapshot` synchronized from:
1. Initial HTTP fetch (`GET /api/snapshot` via `src/lib/api.ts`).
2. Persistent `EventSource('/api/events')` listening for `snapshot` events emitted by `DownloadManager`.

## Modular Views (`src/components/`)
- `DashboardView.tsx` & `BandwidthChart.tsx`
- `DownloadsView.tsx`, `AddDownloadModal.tsx`, `DownloadDetailsDrawer.tsx`
- `QueuesAndSchedulerView.tsx`
- `VideoDownloaderView.tsx`
- `FileManagerView.tsx`
- `AiAssistantView.tsx`
- `BrowserBridgeAndPluginsView.tsx`
- `SettingsView.tsx`
- `DocsView.tsx`

## Related Documentation
- [Backend & SSE Stream](./backend.md)
- [UI Design System](../design/design-system.md)
