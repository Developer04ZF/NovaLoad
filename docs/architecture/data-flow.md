# End-to-End Data Flow

## Transfer Lifecycle Sequence

```mermaid
sequenceDiagram
  participant User as UI / CLI / Extension
  participant API as Express API
  participant Sec as Security Guard
  participant Eng as DownloadManager
  participant DB as SQLite WAL
  participant FS as Disk (.part -> final)

  User->>API: POST /api/downloads (url, connections, checksum)
  API->>Eng: createDownload()
  Eng->>Sec: validateDownloadUrl(url) per redirect hop
  Eng->>Eng: HEAD probe (fallback GET bytes=0-0)
  Eng->>DB: insertDownload + replaceSegments + addEvent
  Eng->>FS: Open <filePath>.part (truncate totalBytes)
  par Segment 0..N-1
    Eng->>FS: Fetch Range + TokenBucketPacer -> write(offset)
    Eng->>DB: updateSegmentProgress (>= 350ms throttle)
  end
  Eng->>FS: Stream SHA-256 & SHA-512 hash check
  Eng->>FS: Rename .part -> <filePath>
  Eng->>DB: status = completed, store digests
  Eng-->>User: SSE snapshot push (/api/events)
```

## Related Documentation
- [Download Engine Overview](../download-engine/overview.md)
- [REST & SSE API Reference](../developer-guide/api-reference.md)
