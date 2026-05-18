CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  page_url TEXT DEFAULT '',
  page_title TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
