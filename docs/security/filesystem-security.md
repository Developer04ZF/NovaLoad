# Filesystem Security & Path Containment

## Filename Sanitization (`sanitizeFilename`)
1. Converts Windows backslashes to `/` and isolates `path.basename()`.
2. Replaces control characters (`0x00–0x1F`, `0x7F`) and reserved characters (`< > : " / \ | ? *`) with `_`.
3. Rejects dot-only traversal names (`.`, `..`) and caps length at `200` characters.

## Path Containment (`resolveSafePath`)
```typescript
const relative = path.relative(resolvedBase, candidate);
if (relative.startsWith('..') || path.isAbsolute(relative)) {
  throw new Error('Path traversal rejected...');
}
```
Both `DownloadManager` (during download placement) and `FileManagerService` (when executing user-approved file moves, renames, folder creations, or duplicate deletions) resolve paths strictly inside `downloadsDir` (`NOVALOAD_DATA_DIR/downloads`). Matching logic in Rust exists in `src-tauri/src/security.rs` (`resolve_safe_path`).

## Related Documentation
- [File Management User Guide](../user-guide/file-management.md)
- [Threat Model](./threat-model.md)
