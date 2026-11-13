# Configuration & Settings Reference

Defaults initialized by `NovaDatabase.seedDefaults()` (`server/db.ts`) and persisted in SQLite (`settings` table):

| Field | Default | Allowed Values / Range | Purpose |
| :--- | :--- | :--- | :--- |
| `theme` | `'dark'` | `'dark' \| 'light' \| 'system'` | Color theme selection. |
| `locale` | `'en'` | `'en' \| 'fa' \| 'ar'` | UI language and LTR/RTL layout direction. |
| `defaultDownloadDir` | `<NOVALOAD_DATA_DIR>/downloads` | Managed directory path | Root storage path for categorized folders. |
| `defaultConnections` | `6` | `1..16` | Default parallel segments per HTTP download. |
| `maxGlobalConcurrent` | `4` | Integer `>= 1` | Maximum concurrent active downloads globally. |
| `globalSpeedLimitKbps` | `null` | `null` or positive integer | Global bandwidth ceiling across all downloads. |
| `clipboardMonitoring` | `true` | Boolean | UI clipboard preference flag. |
| `autoCategorize` | `true` | Boolean | Route completed files into category subfolders. |
| `verifyChecksumOnComplete` | `true` | Boolean | Compute SHA-256 / SHA-512 on completion. |
| `autoRetry` | `true` | Boolean | Automatically retry transient failures. |
| `maxRetries` | `3` | Integer `>= 0` | Max automatic backoff retry attempts. |
| `notifyOnComplete` | `true` | Boolean | Notification preference on completion. |
| `notifyOnError` | `true` | Boolean | Notification preference on error. |
| `minimizeToTray` | `true` | Boolean | Desktop tray minimization preference. |
| `launchOnStartup` | `false` | Boolean | Desktop autostart preference. |
| `browserBridgeEnabled` | `true` | Boolean | Enable `/api/bridge/capture`. |
| `browserBridgeToken` | `nl_bridge_<hex>` | Generated 18-byte random hex | Required `x-novaload-token` header value. |
| `aiEnabled` | `true` | Boolean | Toggle optional Gemini AI assistant endpoints. |
| `aiModel` | `'gemini-4-hydrogen'` | `'gemini-4-hydrogen' \| 'gemini-3.1-flash-lite'` | Active Gemini model identifier. |
| `aiRequireConfirmation` | `true` | Boolean | Require confirmation before file mutations. |
| `aiAllowFileMetadata` | `true` | Boolean | Include sanitized metadata in AI prompts. |
| `aiAllowFileContent` | `false` | Boolean | Keep raw file content offline. |
| `releaseChannel` | `'stable'` | `'stable' \| 'beta'` | Desktop release channel metadata. |
| `privacyBlockPrivateIps` | `true` | Boolean | Enforce private/loopback/metadata SSRF blocking. |

## Related Documentation
- [Configuration Guide](../getting-started/configuration.md)
- [Settings User Guide](../user-guide/settings.md)
