# Server-Side Gemini AI Integration

## Design Goals
- **Strictly Optional**: Zero runtime dependency on `GEMINI_API_KEY` for downloading, scheduling, hashing, or file browsing.
- **Server-Side Only**: Uses `@google/genai` (`^3.3.0`) exclusively inside `server/services/geminiService.ts`. Keys are never exposed to `src/` or persisted in SQLite.
- **Structured JSON Plans**: Requests use `responseMimeType: 'application/json'` and an explicit `responseSchema` producing `summary`, `answer`, and typed `actions`.

## Metadata Scope
`GeminiAssistantService.analyzeAndPropose()` constructs a sanitized payload containing:
- Total file count and byte size
- Per-file `filename`, `relativePath`, `category`, `sizeBytes`, `extension`, 12-char `sha256Prefix`, and `modifiedAt`
- Duplicate SHA-256 groups and up to 60 recent download metadata summaries

Raw file contents are never read or uploaded by default (`aiAllowFileContent: false`).

## Preview & Confirm Execution
Proposed actions (`move`, `rename`, `delete_duplicate`, `create_folder`) are stored in `ai_history` with status `'analyzed'`. Only after explicit user confirmation does `POST /api/files/execute-actions` run `FileManagerService.executeApprovedActions()`.

## Related Documentation
- [Gemini AI Configuration](../integrations/gemini-ai.md)
- [Secrets Management](../security/secrets-management.md)
