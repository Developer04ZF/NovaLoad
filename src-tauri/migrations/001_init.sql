-- NovaLoad SQLite Schema v1 (synchronized with server/db.ts)
CREATE TABLE IF NOT EXISTS queues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  max_concurrent INTEGER NOT NULL DEFAULT 3,
  max_connections_per_download INTEGER NOT NULL DEFAULT 8,
  speed_limit_kbps INTEGER
);

CREATE TABLE IF NOT EXISTS downloads (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL,
  total_bytes INTEGER NOT NULL DEFAULT 0,
  downloaded_bytes INTEGER NOT NULL DEFAULT 0,
  actual_sha256 TEXT,
  created_at TEXT NOT NULL
);
