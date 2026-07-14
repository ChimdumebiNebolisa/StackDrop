# Supported extension inventory

Date: 2026-07-14
Scope: Phase 1.4 inventory of every active supported-extension declaration or assumption found in source, tests, migrations, and documentation.

## Current effective support

StackDrop currently treats these extensions as indexable:

- `txt`
- `pdf`
- `docx`
- `doc`

The active implementation is not driven by one canonical registry. The same four-extension set is declared or assumed in Rust discovery, TypeScript domain types, watcher filtering, database constraints, migrations, parser routing, UI filters, tests, and documentation.

## Active runtime declarations and assumptions

| Area | File | Current declaration or assumption | Consumer impact |
|------|------|-----------------------------------|-----------------|
| Rust discovery | `src-tauri/src/commands/file_commands.rs` | `supported_extension` accepts `txt`, `pdf`, `docx`, `doc`. | `discover_supported_files` is the producer for scan input; unsupported files are skipped before TypeScript sees them. |
| Rust OCR command | `src-tauri/src/commands/file_commands.rs` | `ocr_pdf_with_tools` rejects anything except `pdf`. | PDF OCR fallback is extension-gated independently from discovery. |
| Rust legacy DOC command | `src-tauri/src/commands/file_commands.rs` | `extract_doc_text_with_tools` rejects anything except `doc`. | Legacy `.doc` extraction is extension-gated independently from browser-safe parser dispatch. |
| TypeScript domain type | `src/domain/documents/types.ts` | `FileExtension = "txt" \| "pdf" \| "docx" \| "doc"`. | Search filters, document records, repositories, and scan casts depend on this union. |
| Browser-safe parser dispatch | `src/domain/ingestion/parseFile.ts` | Parses `.txt`, `.pdf`, `.docx`; returns unsupported for all other extensions. | `.doc` is intentionally not handled here because it requires the native legacy extractor. |
| Scan parser routing | `src/features/folders/services/parseDiscoveredFile.ts` | Special-cases `.doc`, delegates other extensions to `parseFileContent`, special-cases `.pdf` for OCR fallback. | Parser behavior is split across native and browser-safe paths. |
| Scan persistence | `src/features/folders/services/runFolderScan.ts` | Casts discovered `file.extension` to `FileExtension`. | Correctness currently relies on Rust discovery returning only the TypeScript union. |
| Watcher filtering | `src/features/folders/services/watchIndexedFolders.ts` | `SUPPORTED_EXTENSIONS = new Set(["txt", "pdf", "docx", "doc"])`. | Native file events for other known extensions are ignored; no-extension or unknown-path events still trigger rescans. |
| SQLite schema | `src/data/db/schema.sql` | `file_extension` check allows only `txt`, `pdf`, `docx`, `doc`. | Database rejects persisted documents outside the four-extension set. |
| SQLite migration | `src/data/db/migrate.ts` | Detects final schema by checking the four extensions; deletes rows outside the same set before rebuilding constraints. | Existing installs with older or unsupported extensions are normalized to the four-extension set. |
| Search query repository | `src/data/search/documentSearchRepository.ts` | Applies extension filter with `d.file_extension = ?`; assumes caller passes a valid `FileExtension`. | Query path depends on TypeScript type validation, not an independent runtime extension list. |
| Document repository | `src/data/repositories/documentRepository.ts` | Stores and filters `FileExtension`. | Persistence is typed, but database constraints remain the final guard. |
| UI filters | `src/features/documents/screens/DocumentLibraryScreen.tsx` | Hardcoded filter options for `.txt`, `.pdf`, `.docx`, `.doc`. | Users can only filter by the four current formats. |
| Diagnostics UI copy | `src/features/documents/screens/DocumentLibraryScreen.tsx` | States unsupported files are filtered during discovery and are not tracked. | Diagnostics assumes unsupported files never enter the index. |
| Diagnostics service | `src/features/folders/services/getIndexDiagnostics.ts` | `unsupportedSkippedFilesTracked: false`. | Diagnostics has no source for skipped unsupported-extension counts. |

## Test and fixture assumptions

| Area | File | Current assumption |
|------|------|--------------------|
| Rust discovery tests | `src-tauri/src/commands/file_commands.rs` | Verifies `.docx` and `.doc` are discovered while `.bin` is skipped; verifies nested `.txt` discovery. |
| Watcher tests | `src/tests/unit/watchIndexedFolders.test.ts` | Uses a `.txt` event as the supported-event representative. |
| Parser tests | `src/tests/unit/parseFile.pdf.test.ts`, `src/tests/unit/parseFile.docx.test.ts`, `src/tests/unit/parseDiscoveredFile.test.ts` | Cover PDF, DOCX, OCR fallback, and legacy DOC extraction routing. |
| Folder scan tests | `src/tests/integration/folderScan.v1.test.ts` | Uses discovered `txt`, `pdf`, `docx`, and `doc` fixtures end to end. |
| Migration tests | `src/tests/integration/migrate.docx.test.ts`, `src/tests/integration/migrate.fts-v2.test.ts`, `src/tests/integration/indexDiagnostics.test.ts` | Recreate or assert the same four-extension schema checks. |
| E2E tests | `src/tests/e2e/web-shell.spec.ts` | Seeds `.txt`, `.pdf`, `.docx`, `.doc`, broken `.doc`, and scanned PDF fixtures; asserts UI filter labels for all four formats. |
| Search fixtures | `src/tests/fixtures/searchLatencyFixtures.ts`, `src/tests/unit/searchAccuracy.test.ts`, `src/tests/unit/repositories.v1.test.ts` | Use `.txt` as the default representative searchable document type. |
| Binary/text fixtures | `src/tests/fixtures/` | Contains fixtures for `.txt`, `.pdf`, `.docx`, and `.doc`; no fixtures exist for deferred Tier 1 formats. |

## Documentation assumptions

| File | Current supported-format claim |
|------|--------------------------------|
| `README.md` | Lists `.txt`, `.pdf`, `.docx`, `.doc`; says unsupported file types are skipped during discovery. |
| `docs/stackdrop-architecture.md` | Documents parser ownership and database extension set as `txt`, `pdf`, `docx`, `doc`. |
| `docs/DATABASE.md` | Documents the four-extension schema constraint and migration cleanup. |
| `docs/API.md` | Documents extension filters and discovery command behavior for the four-extension set. |
| `docs/DEMO_CHECKLIST.md` and `docs/DEMO_VIDEO.md` | Exercise `.txt`, `.pdf`, `.docx`; checklist currently mentions type filters as `txt / pdf / docx` but omits `.doc`. |
| `docs/ENV.md` | Mentions optional OCR and legacy `.doc` parser tools. |
| `docs/PROOF.md`, `docs/RELEASE.md`, `docs/SECURITY.md`, `docs/QA_EDGE_CASE_AUDIT.md` | Contain supported-file or parser limitation language that depends on the four current formats. |
| `.github/workflows/release.yml` | Release body text says supported files are indexed locally, without enumerating extensions. |

## Divergence and registry risks

- Discovery, watcher filtering, TypeScript types, parser routing, database constraints, UI filters, tests, and documentation each carry their own format assumptions.
- `.doc` is supported end to end, but not by `parseFileContent`; it depends on `parseDiscoveredFile` routing to the native `extract_doc_text_under_root` command.
- `.pdf` has two independent extension gates: browser-safe PDF text extraction and native OCR fallback.
- Unsupported files are filtered during Rust discovery and are not persisted or counted in diagnostics.
- `runFolderScan` trusts discovered extensions enough to cast to `FileExtension`; a future mismatch between Rust discovery and TypeScript types would surface later at parser or database boundaries.
- The database migration code treats the current four-extension set as canonical and deletes unsupported legacy rows.
- UI filter options are hardcoded and can drift from backend discovery.
- Some developer/demo documentation still omits `.doc` in checklist wording even though runtime support exists.

## Implications for Phase 2

The canonical capability registry should replace or validate these active lists first:

1. Rust discovery support set.
2. TypeScript `FileExtension` union or generated equivalent.
3. Watcher event filter set.
4. Parser routing table, including native-only `.doc` and OCR-capable `.pdf`.
5. SQLite schema and migration allowed-extension checks.
6. UI type filter options and diagnostics copy.
7. Tests that recreate extension constraints.
8. Supported-format documentation.

Until then, any new extension must be added in all active locations above to avoid partial support.
