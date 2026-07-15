# Database schema and migration implications

Date: 2026-07-15
Scope: Phase 1.5 map of current database schema, migration behavior, and implications for ranking, metadata, and file-type expansion.

## Current schema contract

The canonical schema lives in `src/data/db/schema.sql`, and runtime upgrades are applied by `src/data/db/migrate.ts`.

StackDrop currently stores four persistent model areas:

| Area | Tables | Current role |
|------|--------|--------------|
| Folder registry | `indexed_folders` | One row per indexed root. `root_path` is unique and stores the canonical local folder path. Root-level scan failures are retained in `last_error` and `last_error_at`. |
| Document metadata and extracted text | `indexed_documents` | One row per discovered supported file. `absolute_path` is unique. The row stores display/search metadata, parser status, failure details, extracted text, file size, and modified timestamp. |
| Search index | `document_search` | FTS5 table with unindexed `document_id` plus searchable `file_name`, `relative_path`, and `body`. Rows exist only for parsed documents. |
| Scan diagnostics | `scan_runs` | One row per root scan attempt, with started/finished timestamps and discovered/indexed/failed counters. |

## Producer-to-consumer data flow

1. Rust discovery returns supported files under a registered root.
2. `runFolderScan` compares discovered path, size, modified timestamp, and previous parse status against `indexed_documents`.
3. Changed, new, failed, or missing rows are handled per file.
4. Successful parses are upserted into `indexed_documents` and mirrored into `document_search`.
5. Read or parse failures are upserted into `indexed_documents` with `parse_status = 'parse_failed'`, and any stale FTS row for that document id is removed.
6. Removed files are pruned from both `indexed_documents` and `document_search` after discovery and per-file processing completes.
7. Search joins `document_search` to `indexed_documents`; empty-query browse and substring fallback read `indexed_documents` directly.
8. Diagnostics aggregate from `indexed_documents`, `indexed_folders`, and `scan_runs`.

## Ranking implications

Current relevance ranking is query-time behavior, not stored metadata:

- FTS rows include `file_name`, `relative_path`, and `body`.
- Relevance sorting uses `bm25(document_search, 10.0, 5.0, 1.0)` so filename matches rank above path matches, and path above body matches.
- Exact filename boost is implemented in SQL with `CASE WHEN LOWER(d.file_name) = LOWER(?) THEN 0 ELSE 1 END`.
- Recent sorting orders by `indexed_documents.updated_at DESC`.
- Filename/path substring fallback does not use FTS or BM25 and orders by `updated_at DESC`.

Implications for Phase 5 search work:

- Filename-stem, filename-token, relative-path, typo-tolerant, and match-explainability changes can start as query-layer changes if they only use existing `file_name`, `relative_path`, and `body` data.
- Any persistent token table, normalized filename column, match-source column, or precomputed rank feature would require a migration and backfill strategy.
- Result limits or pagination should be added at query boundaries before adding any persisted ranking state.
- Snippet hardening remains a rendering/query-output concern unless the stored extracted text format changes.

## Metadata implications

`indexed_documents` is the canonical metadata row for all user-visible document state:

- Display and filtering: `relative_path`, `file_name`, `file_extension`, `size_bytes`, `modified_at`, `updated_at`.
- Parser health: `parse_status`, `failure_stage`, `parse_error`.
- Search body source: `extracted_text`.
- Incremental scan skip check: `absolute_path`, `size_bytes`, `modified_at`, `parse_status`.

Implications:

- Adding date, size, extension, folder, and parser-status filters can use existing columns.
- Adding parser identifier, OCR capability, MIME hints, content hash, parser version, or normalized document attributes requires schema changes.
- Adding exact resume behavior requires more state than current `scan_runs` counters because no durable per-file queue or cursor exists.
- Changing skip behavior to include parser version or parser capabilities requires storing that version/capability signature per document.

## File-type expansion implications

The database currently enforces the active file-type set in `indexed_documents.file_extension`:

```sql
file_extension TEXT NOT NULL CHECK (file_extension IN ('txt', 'pdf', 'docx', 'doc'))
```

Runtime migrations also treat that four-extension set as canonical:

- `migrateIndexedDocumentsSchema` deletes rows outside `txt`, `pdf`, `docx`, and `doc` before rebuilding constraints.
- Legacy parse statuses `indexed` and `failed` are mapped to `parsed_text` and `parse_failed`.
- Unsupported legacy rows are not preserved as hidden metadata.

Implications for Phase 2 and Phase 3:

- New supported extensions require updating schema constraints and migration normalization, not only discovery and parser routing.
- The safest Phase 2 registry boundary should generate or validate the SQL allowed-extension list and migration allowed-extension list from the same canonical capability data.
- Expansion migrations must not delete newly supported rows during the transition from the old four-extension schema.
- Existing databases with previously unsupported rows cannot be recovered because current migrations delete unsupported rows; future expansion starts from files rediscovered on disk.
- Per-format maximum file size, parser id, OCR support, native/browser parser location, and default enabled state are not currently persisted.

## Migration inventory

| Migration path | Trigger | Current behavior | Implication |
|----------------|---------|------------------|-------------|
| v0 cleanup | Legacy `items` table exists | Drops old v0 tables. | No compatibility data is carried into the document index. |
| Indexed document rebuild | `indexed_documents` DDL is not final | Deletes unsupported extensions, maps legacy statuses, rebuilds table and indexes. | File-type expansion must update both final-schema detection and rebuild SQL. |
| Diagnostics columns | Missing `last_error`, `last_error_at`, or `failure_stage` | Adds nullable columns in place. | New nullable diagnostics metadata can follow this pattern when no backfill is needed. |
| FTS v2 rebuild | `document_search` lacks `relative_path` | Drops and recreates FTS table, then repopulates from parsed document rows. | Any FTS column change requires rebuilding and repopulating from `indexed_documents`. |

## Index inventory

| Index | Current consumer |
|-------|------------------|
| `idx_documents_folder` | Folder filtering, root diagnostics, pruning by folder. |
| `idx_documents_ext` | Extension filtering. |
| `idx_documents_parse` | Parser-status filtering and diagnostics. |
| `idx_documents_updated` | Recent browse/search ordering. |
| FTS internal indexes | Full-text matching on filename, relative path, and body. |

Implications:

- Existing indexes are aligned with current filters and diagnostics.
- Date and size filters can be implemented without new indexes first, then measured in Phase 6 before adding indexes.
- Query-plan inspection should precede any additional index committed for performance.

## Transaction and consistency notes

Current scan processing is resilient per file, but it is not a single transaction for the full folder scan:

- Each file result is persisted independently.
- Successful parses upsert metadata and then write FTS.
- Failed reads/parses upsert metadata and remove FTS.
- Pruning removes stale FTS rows before deleting document rows.
- `scan_runs` is finalized in `finally` after the per-file loop begins.

Implications:

- One failed file does not cancel the folder scan.
- Current tests verify stale FTS removal for changed, moved, unreadable, and parse-failed files.
- Phase 6 transactional consistency work should verify or tighten atomicity between metadata and FTS updates for each document.
- If per-document atomicity is required, repository helpers already have a `withTransaction` utility that can wrap multi-statement document/FTS updates.

## Known gaps to carry forward

- No canonical file-type capability registry feeds schema or migrations yet.
- No migration version table exists; migration detection is based on table presence and DDL inspection.
- No durable scan queue or exact resume cursor exists.
- No parser version, parser id, content hash, MIME hint, or capability signature is stored per document.
- No unsupported-file counters are stored for diagnostics.
- Platform-specific migration behavior was verified through the TypeScript SQLite test harness, not by opening an existing packaged app database.

