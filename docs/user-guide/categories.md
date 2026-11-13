# Automatic Categorization

## How Routing Works
When `settings.autoCategorize` is enabled (`true` by default), `DownloadManager.classifyCategory()` inspects the resolved file extension against `categories` rules and places the transfer inside `resolveSafePath(downloadsDir, categoryRule.subfolder)`.

## Default Category Rules

| ID | Name | Subfolder | Extensions | Color Token |
| :--- | :--- | :--- | :--- | :--- |
| `software` | Software | `Software` | `exe`, `msi`, `dmg`, `appimage`, `deb`, `rpm`, `iso`, `pkg` | `blue` |
| `archives` | Archives | `Archives` | `zip`, `tar`, `gz`, `7z`, `rar`, `xz`, `bz2`, `zst` | `amber` |
| `documents` | Documents | `Documents` | `pdf`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`, `txt`, `md`, `csv`, `json` | `emerald` |
| `video` | Video | `Video` | `mp4`, `mkv`, `webm`, `mov`, `avi`, `m4v` | `violet` |
| `audio` | Audio | `Audio` | `mp3`, `flac`, `wav`, `aac`, `ogg`, `m4a`, `opus` | `cyan` |
| `images` | Images | `Images` | `png`, `jpg`, `jpeg`, `webp`, `svg`, `gif`, `avif` | `rose` |
| `other` | Other | `Other` | *(fallback for unmatched extensions)* | `slate` |

You can edit extensions or add custom categories in the **Categories** view (`POST /api/categories`).

## Related Documentation
- [File Management](./file-management.md)
- [Animated File Organization Preview](../../assets/animations/file-organization.svg)
