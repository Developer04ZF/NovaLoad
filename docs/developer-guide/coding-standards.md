# Coding Standards

## TypeScript & React Rules
- **Strict Type Safety**: Keep interfaces centralized in `src/shared/types.ts` and validate external HTTP payloads with `zod` (`server/app.ts`). Avoid `any` escapes in engine or security code.
- **Styling**: Use Tailwind CSS (`@import "tailwindcss";` in `src/index.css`) with utility classes supporting both `.dark` and light modes. Avoid inline `style` objects except where computed dynamic dimensions (e.g., SVG gauge widths) require them.
- **No Unwired Controls**: Every button and form control must perform a real state mutation or API request.
- **Accessibility & Motion**: Use semantic `<button>` / `<nav>` / `<main>` elements and honor `prefers-reduced-motion`.

## Security & Disk Rules
- Every file operation inside downloads storage must pass `resolveSafePath(downloadsDir, ...)`.
- Every network URL and HTTP redirect hop must pass `validateDownloadUrl()`.
- Never store or serialize `GEMINI_API_KEY` into client bundles, SQLite, or error logs.

## Related Documentation
- [Frontend Development](./frontend-development.md)
- [Backend Development](./backend-development.md)
- [Security Model](../security/security-model.md)
