# Frontend Development

## Entry & Build
- Root HTML entry: `index.html`
- React mount: `src/main.tsx` → `src/App.tsx`
- Global Tailwind stylesheet: `src/index.css`
- Vite config: `vite.config.ts` (note HMR can be controlled via `DISABLE_HMR`).

## Adding or Extending Views
1. Define shared response/request shapes in `src/shared/types.ts`.
2. Add typed fetch methods in `src/lib/api.ts`.
3. Create modular components in `src/components/` supporting Dark/Light surfaces (`bg-white dark:bg-[#121722]`) and logical RTL spacing (`TRANSLATIONS` in `src/lib/i18n.ts`).
4. Add unit/DOM assertions in `tests/ui.test.tsx`.

## Custom SVG Assets in React
UI brand marks, Novi mascot expressions, and empty-state illustrations live in `src/components/svg/` (`NovaLogo.tsx`, `NoviMascot.tsx`, `NovaIllustrations.tsx`), aligned visually with the standalone vectors in `assets/`.

## Related Documentation
- [React Frontend Architecture](../architecture/frontend.md)
- [UI Design System](../design/design-system.md)
