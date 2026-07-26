# StackDrop database model

Canonical schema: [`src/data/db/schema.sql`](../src/data/db/schema.sql). Runtime migrations: [`src/data/db/migrate.ts`](../src/data/db/migrate.ts). Schema and migration roadmap implications are mapped in [`docs/DATABASE_SCHEMA_MIGRATION_MAP.md`](DATABASE_SCHEMA_MIGRATION_MAP.md).

## Tables

### `indexed_folders`

| Column | Purpose |
|--------|---------|
| `id` | UUID primary key |
| `root_path` | Canonical absolute path; **UNIQUE** (duplicate roots rejected at insert) |
| `created_at` | ISO timestamp |
| `last_scan_at` | Last completed scan for this root (nullable until first scan) |
| `last_error`, `last_error_at` | Last root-level scan error and timestamp; cleared after a successful scan |

### `indexed_documents`

| Column | Purpose |
|--------|---------|
| `id` | UUID primary key |
| `folder_id` | FK → `indexed_folders` (CASCADE delete) |
| `absolute_path` | Canonical file path; **UNIQUE** app-wide (prevents duplicate index rows for same file) |
| `relative_path` | Path relative to root (grouping / display) |
| `file_name` | Base name for search + UI |
| `file_extension` | Generated supported file extension from `src/shared/fileCapabilities.json` — enforced with `CHECK` |
| `size_bytes`, `modified_at` | Filesystem metadata at scan time |
| `parse_status` | `parsed_text` \| `parsed_ocr` \| `parse_failed` |
| `failure_stage` | Nullable failure classifier: `read` for byte-read failures, `parse` for parser/OCR/extractor failures |
| `parse_error` | Populated when parse/read fails |
| `extracted_text` | Plain text used for preview + FTS body when indexed |
| `updated_at` | Last upsert time |

### `document_search` (FTS5)

Virtual table: `document_id` (UNINDEXED), `file_name`, `relative_path`, `body`. Rows exist only for successfully parsed documents; failed parses remove FTS rows.

Search uses weighted `bm25(document_search, 10.0, 5.0, 1.0)` for relevance ranking (filename > path > body), with an exact-filename boost and `snippet()` for highlighted body excerpts.

### `scan_runs`

Per-folder run: `started_at`, `finished_at`, counters `files_discovered`, `files_indexed`, `files_failed` for diagnostics. `files_indexed` includes files confirmed already indexed and unchanged during a repeat scan.

## Indexes (why they exist)

| Index | Columns | Reason |
|-------|---------|--------|
| `idx_documents_folder` | `folder_id` | Fast listing/filtering by indexed root |
| `idx_documents_ext` | `file_extension` | Type filter in UI and queries |
| `idx_documents_parse` | `parse_status` | Parse-status filter |
| `idx_documents_updated` | `updated_at DESC` | “Recent first” browse order |

## Migrations

`runMigrations` applies `schema.sql` (`CREATE IF NOT EXISTS`), then `migrateIndexedDocumentsSchema`, which:

1. Detects legacy `indexed_documents` DDL that still allows removed types (e.g. `md`) or predates the canonical triple.
2. Deletes FTS + document rows whose extension is not in the generated supported-extension set.
3. Rebuilds `indexed_documents` with the generated canonical `CHECK` and restores indexes.

`migrateFtsSchemaV2` detects the old 2-column FTS table and rebuilds it with the 3-column schema (`file_name`, `relative_path`, `body`), repopulating from `indexed_documents`.

`migrateDiagnosticsColumns` adds nullable diagnostics columns for existing databases:

- `indexed_folders.last_error`
- `indexed_folders.last_error_at`
- `indexed_documents.failure_stage`

## Duplicate handling

- **Same file path:** `absolute_path` is `UNIQUE`; upserts update the existing row.
- **Same root added twice:** `root_path` is `UNIQUE` on folders; services check before insert where needed.

## Pruning missing files

After each scan, `deleteDocumentsNotInPaths` removes DB + FTS rows for files no longer present under that root (disk files are never deleted by StackDrop).

## Transactions

`runFolderScan` records the scan run before per-file work, checks existing state for each discovered path, skips unchanged healthy files by path + size + modified timestamp, commits changed/new/failed file results as they are handled, and finalizes the scan run in `finally` for handled read/parse failures and timeouts. This prevents one stuck file from leaving the UI in `Scanning...` with an open scan row. Pruning removed files runs only after discovery and the per-file loop complete, so an unavailable/problematic root does not wipe existing indexed results.

Repository helpers still use [`withTransaction`](../src/lib/db/withTransaction.ts) where atomic multi-statement updates are required.
