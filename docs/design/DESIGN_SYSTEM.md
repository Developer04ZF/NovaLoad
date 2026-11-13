# NovaLoad Design System & Visual Identity

## 1. Brand Identity
- **Product Name**: NovaLoad
- **Tagline**: Download smarter. Manage everything.
- **Primary Mark**: `src/components/svg/NovaLogo.tsx` — geometric rounded square (`rx=9`), cobalt-indigo fill (`#2563EB` / `#3B82F6`), precision downward vector arrow paired with an orbital acceleration arc.

## 2. Color Tokens
- **Dark Theme**: Canvas `#0B0E14`, Surface `#121722`, Subtle `#18202F`, Border `#232D3F`, Text Primary `#F1F5F9`, Text Secondary `#94A3B8`.
- **Light Theme**: Canvas `#F8FAFC`, Surface `#FFFFFF`, Subtle `#F1F5F9`, Border `#E2E8F0`, Text Primary `#0F172A`, Text Secondary `#475569`.
- **Primary Accent**: `#2563EB` (Light) / `#3B82F6` (Dark).
- **Semantic Status**: Nominal/Completed `#16A34A`, Paused/Warning `#D97706`, Failed/Error `#DC2626`. Statuses always pair color with explicit text labels and icons.

## 3. Typography
- **Display / Headings**: `Plus Jakarta Sans` (weights 600–700)
- **Body / Controls**: `DM Sans` (weights 400–600)
- **Data / Telemetry**: `JetBrains Mono` with `font-variant-numeric: tabular-nums`

## 4. Layout, Accessibility & RTL
- Desktop shell features a collapsible 240px sidebar, single-line 56px top bar, and 1440px max-width workspace.
- Single-elevation surfaces separated by 1px borders and clean whitespace.
- Respects `prefers-reduced-motion: reduce` and supports `dir="rtl"` for Persian (`fa`) and Arabic (`ar`).

## 5. Custom SVG Assets & Mascot ("Novi")
- **Novi Mascot** (`src/components/svg/NoviMascot.tsx`): 7 expressive states (`idle`, `happy`, `working`, `downloading`, `success`, `warning`, `error`).
- **16 Scene Illustrations** (`src/components/svg/NovaIllustrations.tsx`): Empty dashboard, no downloads, empty search, downloading, paused, completed, failed, network error, offline, video downloader, browser integration, AI assistant, file organization, storage management, updates, and first launch.
- Inspect the live visual catalog inside **About NovaLoad** in the app.
