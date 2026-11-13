# UI Design System & Color Tokens

## 1. Color System
- **Dark Theme**:
  - Canvas `#0B0E14`, Surface `#121722`, Subtle `#18202F`, Border `#232D3F`
  - Text Primary `#F1F5F9`, Text Secondary `#94A3B8`
  - Accent `#3B82F6`
- **Light Theme**:
  - Canvas `#F8FAFC`, Surface `#FFFFFF`, Subtle `#F1F5F9`, Border `#E2E8F0`
  - Text Primary `#0F172A`, Text Secondary `#475569`
  - Accent `#2563EB`
- **Semantic Status**:
  - Completed / Verified `#16A34A` / `#10B981`
  - Paused / Warning `#D97706` / `#F59E0B`
  - Failed / Blocked `#DC2626` / `#EF4444`

Statuses always pair color with explicit text labels and icons rather than relying on color alone.

## 2. Typography
- **Display / Headings**: `Plus Jakarta Sans` (`600–700`)
- **UI Body & Controls**: `DM Sans` (`400–600`)
- **Numeric Telemetry & Hashes**: `JetBrains Mono` with `font-variant-numeric: tabular-nums`

## 3. Spatial Layout
- Collapsible `240px` (`w-60`) navigation sidebar, `56px` (`h-14`) top bar, `1440px` max workspace width (`src/App.tsx`).

## Related Documentation
- [Brand Guidelines](./brand-guidelines.md)
- [Accessibility & RTL Support](./accessibility.md)
