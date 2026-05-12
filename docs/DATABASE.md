# StackDrop database model

Canonical schema: [`src/data/db/schema.sql`](../src/data/db/schema.sql). Runtime migrations: [`src/data/db/migrate.ts`](../src/data/db/migrate.ts).

## Tables

### `indexed_folders`

| Column | Purpose |
|--------|---------|
| `id` | UUID primary key |
| `root_path` | Canonical absolute path; **UNIQUE** (duplicate roots rejected at insert) |
| `created_at` | ISO timestamp |
| `last_scan_at` | Last completed scan for this root (nullable until first scan) |

### `indexed_documents`

| Column | Purpose |
|--------|---------|
| `id` | UUID primary key |
| `folder_id` | FK → `indexed_folders` (CASCADE delete) |
| `absolute_path` | Canonical file path; **UNIQUE** app-wide (prevents duplicate index rows for same file) |
| `relative_path` | Path relative to root (grouping / display) |
| `file_name` | Base name for search + UI |
| `file_extension` | `txt` \| `pdf` \| `docx` — enforced with `CHECK` |
| `size_bytes`, `modified_at` | Filesystem metadata at scan time |
| `parse_status` | `indexed` \| `failed` |
| `parse_error` | Populated when parse/read fails |
| `extracted_text` | Plain text used for preview + FTS body when indexed |
| `updated_at` | Last upsert time |

### `document_search` (FTS5)

Virtual table: `document_id` (UNINDEXED), `file_name`, `body`. Rows exist only for successfully indexed documents; failed parses remove FTS rows.

### `scan_runs`

Per-folder run: `started_at`, `finished_at`, counters `files_discovered`, `files_indexed`, `files_failed` for diagnostics.

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
2. Deletes FTS + document rows whose extension is not `txt` / `pdf` / `docx`.
3. Rebuilds `indexed_documents` with the canonical `CHECK` and restores indexes.

## Duplicate handling

- **Same file path:** `absolute_path` is `UNIQUE`; upserts update the existing row.
- **Same root added twice:** `root_path` is `UNIQUE` on folders; services check before insert where needed.

## Pruning missing files

After each scan, `deleteDocumentsNotInPaths` removes DB + FTS rows for files no longer present under that root (disk files are never deleted by StackDrop).

## Transactions

`runFolderScan` wraps DB writes (scan run row, per-file upserts, prune, scan run finish, folder `last_scan_at`) in a single SQLite `BEGIN` / `COMMIT` / `ROLLBACK` transaction via [`withTransaction`](../src/lib/db/withTransaction.ts) so a mid-scan failure does not leave a half-updated index for that pass.
