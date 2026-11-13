# Accessibility & RTL Support

## Accessibility Measures
- **Contrast**: Color tokens preserve high text legibility across Dark (`#F1F5F9` on `#0B0E14`/`#121722`) and Light (`#0F172A` on `#FFFFFF`/`#F8FAFC`) themes.
- **Reduced Motion**: Every animated SVG under `assets/animations/` includes `@media (prefers-reduced-motion: reduce)` disabling transform/opacity loops, and UI motion uses calm transitions.
- **Semantic Markup & ARIA**: Interactive controls use native `<button>` elements, ARIA roles (`role="img"`, `aria-label`), and `Escape` modal dismissal (`src/App.tsx`).

## Multi-Language & Right-to-Left (RTL) Support
NovaLoad natively supports (`src/lib/i18n.ts`):
- **`en`** (English — `dir="ltr"`)
- **`fa`** (Persian / فارسی — `dir="rtl"`)
- **`ar`** (Arabic / العربية — `dir="rtl"`)

Changing the locale in **Settings** updates `document.documentElement.lang` and `document.documentElement.dir` dynamically so navigation, drawers, and directional spacing adapt seamlessly.

## Related Documentation
- [UI Design System](./design-system.md)
- [Application Settings](../user-guide/settings.md)
