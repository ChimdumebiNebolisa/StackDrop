PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS indexed_folders (
  id TEXT PRIMARY KEY,
  root_path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_scan_at TEXT
);

CREATE TABLE IF NOT EXISTS indexed_documents (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL REFERENCES indexed_folders(id) ON DELETE CASCADE,
  absolute_path TEXT NOT NULL UNIQUE,
  relative_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_extension TEXT NOT NULL CHECK (file_extension IN ('txt', 'pdf', 'docx', 'doc')),
  size_bytes INTEGER NOT NULL,
  modified_at TEXT NOT NULL,
  parse_status TEXT NOT NULL CHECK (parse_status IN ('parsed_text', 'parsed_ocr', 'parse_failed')),
  parse_error TEXT,
  extracted_text TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_folder ON indexed_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_ext ON indexed_documents(file_extension);
CREATE INDEX IF NOT EXISTS idx_documents_parse ON indexed_documents(parse_status);
CREATE INDEX IF NOT EXISTS idx_documents_updated ON indexed_documents(updated_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS document_search USING fts5(
  document_id UNINDEXED,
  file_name,
  body
);

CREATE TABLE IF NOT EXISTS scan_runs (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL REFERENCES indexed_folders(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  files_discovered INTEGER NOT NULL DEFAULT 0,
  files_indexed INTEGER NOT NULL DEFAULT 0,
  files_failed INTEGER NOT NULL DEFAULT 0
);
