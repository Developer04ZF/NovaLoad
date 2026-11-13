# SVG & Animation Guidelines

## Asset Inventory
- **Feature Illustrations (`assets/illustrations/`)**: `multi-connection.svg`, `pause-resume.svg`, `queue-scheduler.svg`, `integrity-verification.svg`, `browser-bridge.svg`, `video-downloader.svg`, `gemini-ai.svg`, `file-management.svg`, `cross-platform.svg`.
- **Custom Icons (`assets/icons/`)**: `icon-download.svg`, `icon-queue.svg`, `icon-shield.svg`, `icon-terminal.svg`, `icon-ai.svg`.
- **Animated Vectors + Fallbacks (`assets/animations/`)**:
  Each of the 8 core motion scenes ships in three forms:
  1. **Editable Animated SVG (`*.svg`)**: Pure CSS `@keyframes` motion with `@media (prefers-reduced-motion: reduce)` disabled motion rules and zero `<script>` tags.
  2. **Static SVG Fallback (`*-static.svg`)**: Clean vector fallback for reduced-motion or restrictive SVG viewers.
  3. **Verified Multi-Frame GIF (`*.gif`)**: Multi-frame animated raster preview (`8–12` frames, `12–42 KB`) generated cleanly for reliable animation playback inside GitHub Markdown (`README.md`).

## GitHub Compatibility Policy
GitHub strips `<script>` elements and may throttle or suspend CSS animations inside `<img>`-proxied SVGs. Never embed scripts in SVGs, test all vector files via `npm run docs:validate`, and use verified `.gif` previews or `*-static.svg` fallbacks inside GitHub README contexts.

## Related Documentation
- [Novi Mascot Guidelines](./mascot-guidelines.md)
- [Accessibility & RTL Support](./accessibility.md)
