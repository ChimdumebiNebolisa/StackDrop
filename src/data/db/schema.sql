PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('note', 'link', 'file')),
  title TEXT NOT NULL,
  source_path TEXT,
  source_url TEXT,
  preview_text TEXT,
  is_indexed INTEGER NOT NULL CHECK (is_indexed IN (0, 1)),
  parse_status TEXT NOT NULL CHECK (parse_status IN ('not_applicable', 'indexed', 'failed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS note_contents (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  body TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS link_metadata (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS file_metadata (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_extension TEXT NOT NULL,
  extracted_text TEXT
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS item_search USING fts5(
  item_id UNINDEXED,
  title,
  body
);

CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_collection_id ON items(collection_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);
