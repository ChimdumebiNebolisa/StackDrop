# StackDrop Architecture

Version: v1.1 (folder indexing)  
Status: Locked for v1 build  
Date: 2026-05-12

## 1. Architecture goal

Define clear boundaries for a **local-first**, **single-user** desktop app that **indexes documents under user-selected folders**, **persists index state locally**, and **searches** by name and content—without accounts, remote services, or implicit full-disk indexing.

## 2. Major system parts

### 2.1 Desktop shell (Tauri)

**Ownership**

- Native window lifecycle.
- **Folder** and optional **file** pickers (dialog).
- OS path canonicalization and **safety checks** for paths returned to the TypeScript layer.
- **Recursive filesystem discovery** for supported extensions under a **validated** folder root (Rust), returning structured file metadata (path, size, modified time)—not business parsing rules.

**Does not own**

- PDF/text parsing policy beyond reading bytes safely.
- SQLite schema or FTS population rules.
- Search ranking policy beyond what SQLite FTS provides.

### 2.2 UI application (React + TypeScript)

**Ownership**

- Screens, routes, presentation state, loading/empty/error UI.
- Calls **application services** through explicit functions/hooks.

**Does not own**

- Direct recursive directory scanning (no `fs` walk in components).
- Direct SQLite writes (no repository calls from `screens/` / `hooks/` except the documented composition root if any).

### 2.3 Application services (TypeScript)

**Ownership**

- Use cases: **register folder**, **remove folder**, **run manual scan**, **list documents**, **get document detail**, **search**.
- Validation of inputs that are not OS-level (e.g. empty query behavior, filter enums).
- Orchestration: invoke shell discovery → read bytes via shell or approved IO → call parser → persist via repositories → update FTS.

**Does not own**

- Raw SQL string building scattered in UI.
- OS-specific path canonicalization (delegates to shell).

### 2.4 Parsing layer (TypeScript)

**Ownership**

- Format-specific parsers for **`.txt`**, **`.md`**, **`.pdf`**.
- Structured **parse result**: success with text, or failure with explicit error (no swallowed exceptions in the public API).

**Does not own**

- Filesystem traversal.
- Persistence.

### 2.5 Persistence and search store (SQLite + FTS5)

**Ownership**

- `indexed_folders`, `indexed_documents`, optional `scan_runs` (or equivalent), and FTS virtual table for document search.
- CRUD for folders and documents and transactional updates around scan batches.
- Parameterized search queries (FTS `MATCH` + filters).

**Does not own**

- UI state.
- Dialogs.
- Parsing bytes from disk.

## 3. Interfaces between parts

### UI → application services

Allowed (illustrative):

- `listIndexedFolders()`
- `addIndexedFolder()` → triggers dialog + register path
- `removeIndexedFolder(folderId)`
- `rescanFolder(folderId)`
- `listDocuments(filters)`
- `getDocumentDetail(documentId)`
- `searchDocuments(query, filters)`

**Rule:** UI never writes SQLite directly.

### Application services → desktop shell

Allowed:

- `open_folder_dialog() -> Option<String>` (canonical folder path)
- `discover_supported_files(root_path) -> Vec<DiscoveredFile>`
- `read_file_bytes_for_root(path, root_path) -> Vec<u8>` (must validate `path` is under `root_path` after canonicalization)

**Rule:** The shell rejects paths that fail canonicalization or root containment checks.

### Application services → parsing

- `parseDocument(bytes, extension) -> ParseResult`

### Application services → persistence

- Repository methods for folders, documents, FTS rows, scan metadata.

**Rule:** Parsing and indexing failures are **explicit** in stored `parse_status` / error fields and in return values to the UI.

## 4. Core entities

### IndexedFolder

- `id` (stable string UUID)
- `rootPath` (canonical absolute path string)
- `createdAt`
- `lastScanAt` (nullable until first successful scan completes)

### IndexedDocument

- `id`
- `folderId` (FK → IndexedFolder)
- `absolutePath` (unique)
- `relativePath` (relative to folder root)
- `fileName`
- `fileExtension` (`txt` | `md` | `pdf`)
- `sizeBytes`
- `modifiedAt` (ISO string from discovery)
- `parseStatus` (`indexed` | `failed` | `unsupported` if stored)
- `parseError` (nullable)
- `extractedText` (nullable; bounded preview acceptable if documented in Plan)
- `updatedAt`

### ScanRun (optional but recommended)

- `id`, `folderId`, `startedAt`, `finishedAt`, counters (`filesDiscovered`, `indexed`, `failed`, `skippedUnsupported`)

### SearchQuery / SearchResult (logical shapes)

- **SearchQuery:** `text`, optional `folderId`, optional `extension`, optional `parseStatus`, optional `sort` (`relevance` | `recent`).
- **SearchResult:** document fields needed for list + snippet/preview pointers.

## 5. Data ownership rules

- **IndexedFolder** is the source of truth for registered roots.
- **IndexedDocument** is the source of truth for per-file index state under a folder.
- **FTS rows** are derived from `fileName` + `extractedText` and must be kept consistent on insert/update/delete.
- The storage layer enforces integrity; **policy** (what gets indexed) lives in application services.

## 6. External dependencies (allowed)

- Tauri, React, TypeScript, Vite
- SQLite via `tauri-plugin-sql` from the TypeScript layer (current approach)
- SQLite FTS5 for full-text search
- `pdfjs-dist` (or equivalent) for PDF text extraction in TypeScript
- Vitest, Playwright for verification

## 7. Chosen stack (after responsibilities)

- **Shell:** Tauri v2
- **UI:** React + TypeScript + Vite
- **Persistence:** SQLite + FTS5
- **Tests:** Vitest + Playwright (web/e2e shims as needed)

## 8. Folder and file structure (target)

```text
stackdrop/
  src/
    app/
    features/
      folders/        # register, list, remove, rescan UI + services
      documents/      # list, detail UI + services
      search/         # search bar + filters
    domain/
      documents/      # types, parse orchestration helpers
      ingestion/      # parsers (.txt, .md, .pdf)
      search/         # query building / normalization
    data/
      db/
      repositories/
      search/
    tests/
  src-tauri/
    src/
      commands/     # dialog, discover, safe read
      path_utils.rs
```

Legacy v0 feature folders (`notes/`, `links/`, `tags/`, `collections/`) are **removed** from the active codebase for v1 unless retained strictly behind a **migration** module described in the Plan.

## 9. Boundary rules

- No remote backend without Architecture + PRD update.
- No business rules in UI components beyond presentation.
- No SQL in UI.
- **No silent parse failures** and no treating unsupported files as indexed content.

## 10. Known assumptions

- One local SQLite database file is sufficient for v1.
- Manual re-scan is sufficient for freshness; there is **no** continuous watcher.
- FTS5 is available in the linked SQLite build (verified in tests).
