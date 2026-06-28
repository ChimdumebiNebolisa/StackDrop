# StackDrop QA Edge-Case Audit

## Test Environment Assumptions

- Primary target: Windows packaged Tauri desktop app.
- Automated logic coverage: Vitest unit/integration tests with `better-sqlite3` and mocked Tauri filesystem calls.
- Browser shell coverage: Playwright E2E with `VITE_E2E_SQLITE=1`, sql.js FTS5, and a mocked filesystem bridge.
- Packaged-app manual coverage is still required for real filesystem permissions, watcher behavior, removable/unavailable folders, bundled Poppler/Tesseract/antiword resolution, and Windows path behavior.
- Use the repeatable packaged-app harness in [`PACKAGED_WINDOWS_SMOKE_TEST.md`](PACKAGED_WINDOWS_SMOKE_TEST.md) for Windows corpus setup, watcher mutations, offline-root simulation, permission-denied simulation, and cleanup.
- Supported indexed extensions are `.txt`, `.pdf`, `.docx`, and `.doc`. Other extensions should be skipped, not shown as parse failures.
- Search should feel explainable: a missing file should map to one of these states: undiscovered, unsupported, read failed, parse failed, stale until rescan, removed from index, or not matched by query semantics.

## Index Diagnostics Behavior

The library screen now includes an **Index Diagnostics** panel near the index controls.

- Shows indexed folder count, total indexed document rows, searchable documents, parser failures, read failures, unknown legacy failures, and root issues.
- Shows each folder's health: healthy, never scanned, has failures, scan incomplete, or root issue.
- Shows each folder's last scan time plus the latest recorded scan-run counts when available.
- Persists root-level scan failures on `indexed_folders.last_error` and clears them after a successful scan.
- Refreshes diagnostics after successful and failed manual/watcher scans so root errors are visible without reload/navigation.
- Records failed document stage in `indexed_documents.failure_stage` as `read` or `parse` for new failures.
- Links recent failed documents to the detail screen, where failure stage and parse error are visible.
- Unsupported/skipped file counts are still not tracked; discovery filters unsupported extensions before scan rows are written.

## Edge-Case Checklist

| Edge case | Expected behavior | Current behavior inferred from code | Risk | Recommended fix | Coverage |
|---|---|---|---|---|---|
| File added after initial indexing | Auto-index while open should rescan after watcher/poll detects change; manual Index library should also find it. | Watcher debounces supported-file events and poll fallback compares folder signatures. Native watches are registered before slow initial signature discovery, so large existing roots should not delay watching later roots. Manual scan discovers supported files. | Medium | Packaged smoke must wait for the watcher-ready label before mutation and restart after DB-level root setup. | Playwright shim covers create; Vitest covers watcher registration before slow signature discovery; packaged smoke passed on 2026-06-28. |
| File edited after indexing | New content should replace old FTS body; old content should stop matching after rescan. | Upsert by `absolute_path` plus FTS delete/insert should replace content. | High | Keep regression test for old token removal. | Vitest added. |
| File renamed | Old filename/path should be pruned; new filename/path should appear after rescan. | Full rescan prunes paths not in current discovery and inserts new path. | High | Keep regression test; manually verify watcher emits rename as expected. | Vitest added; Playwright shim covers rename. |
| File moved within indexed root | Old relative path should disappear; new relative path should be searchable after rescan. | Treated as delete plus add because `absolute_path` changes. | High | Keep regression test; manually verify watcher behavior. | Vitest added. |
| File deleted | DB row and FTS row should be removed after rescan. | `deleteDocumentsNotInPaths` removes both DB and FTS rows. | High | Keep existing regression coverage. | Existing Vitest and Playwright. |
| Folder removed, unavailable, or too slow to discover | Existing index should not be wiped just because discovery failed or times out; UI should show a root-specific warning and continue later roots. | `discover_supported_files` errors before transaction/prune; packaged discovery has a two-minute timeout; full-library scan records folder `last_error`, reports a warning, and continues to later roots. | High | Re-run packaged smoke with an unavailable/problematic root. | Vitest added for preservation, timeout continuation, and root error; diagnostics tests added. |
| File read or parser hangs after discovery | One bad file should not keep a root scan in `Scanning...`; scan run should finish, the file should be recorded as failed, and later files should continue. | Per-file reads and parser calls now have bounded timeouts. Timed-out reads/parses become staged failures, stale FTS is removed for that file, and `scan_runs.finished_at` is populated in `finally` for handled failures. | High | Keep timeout regressions and periodically rerun packaged corpus with corrupt/large files. | Vitest added for never-resolving read and parser promises; packaged smoke root rescan completed. |
| Unsupported file types | Unsupported files should be skipped, not reported as parse failures. | Rust discovery filters extensions to txt/pdf/docx/doc before scan rows exist; diagnostics explicitly says skipped counts are not tracked. | Low | Future additive skipped-file counter if users need this quantified. | Rust tests already cover extension filtering; diagnostics doc/UI notes gap. |
| Corrupt supported files | File should appear with `parse_failed`, store `parse_error`, and be excluded from body FTS. | Parser errors are caught, stored with `failure_stage = 'parse'`, linked in recent failures, and shown on detail. | Medium | Keep recent-failures and detail coverage visible. | Existing PDF/DOC tests; diagnostics tests added. |
| Empty files | Empty `.txt` should appear as parsed with no body snippet; search by body should not match. Empty PDF/DOC/DOCX may fail depending parser behavior. | `.txt` parser returns empty string and scan treats it as parsed text. | Low | Keep automated `.txt` coverage; document empty binary-doc behavior manually. | Vitest added for empty `.txt`. |
| Very large files | File should not crash indexing; should record read failure and avoid stale FTS content. | Rust read path has 50 MB cap and returns error; scan stores `parse_failed` with `failure_stage = 'read'`, removes FTS row, and result rows label it `Read failure`. | High | Manually retest real sparse/large file in packaged app. | Vitest added for read rejection path; diagnostics tests added; Playwright shim covers result label. |
| Permission-denied files/folders | One unreadable file should be recorded as failed if discovered; unreadable traversal can currently fail the whole root. | Per-file read failure is visible as read failure. Rust WalkDir/metadata errors abort discovery and show as folder root issue. | High | Future Rust discovery should skip inaccessible entries and return discovery warnings. | Manual packaged required. |
| Binary file renamed as supported extension | Should not crash; should become `parse_failed` or parsed gibberish for `.txt` depending decoder. | `.pdf/.docx/.doc` failures are stored. `.txt` uses lossy UTF-8 decode, so binary-like text can be indexed. | Medium | Consider future binary sniffing for `.txt`; no broad change in this pass. | Manual recommended. |
| Scanned PDF / OCR unavailable | If text extraction is near-empty and OCR fails, document should be `parse_failed` with OCR error. | OCR fallback is called for near-empty PDFs; failure is stored if no extracted text exists. | High | Packaged test bundled Tesseract/Poppler paths. | Existing Vitest/Rust conditional tests; manual packaged required. |
| PDF with selectable text | Should index as `parsed_text` without OCR and be searchable through FTS. | PDF text parser returns text; OCR not called when enough text exists. The packaged smoke PDF generator now places its unique token on a separate visible line so extraction stores the full token. | Medium | Re-run packaged smoke setup search for `STACKDROP_SMOKE_PDF_TEXT_20260627`. | Existing Vitest plus smoke-generated PDF FTS regression. |
| DOCX with tables/headers/footers | Body text should be extracted where Mammoth supports it; unsupported structures should not crash. | Mammoth `extractRawText` handles main document text; headers/footers coverage is not explicit. | Medium | Add future fixture with table/header/footer if product depends on that content. | Manual or future fixture. |
| Legacy `.doc` behavior | Should use local antiword bridge; errors should be visible. | `.doc` extraction runs through Tauri command and stores failures. | Medium | Packaged test antiword bundle and `ANTIWORDHOME`. | Existing Vitest and conditional Rust tests; manual packaged required. |
| Punctuation-heavy queries | Should not throw. Pure punctuation should return no results, not the whole library. | Query normalization strips punctuation; fixed to return `[]` for non-empty no-term queries. | High | Keep regression test. | Vitest added. |
| Hyphen/underscore queries | Hyphens split into terms; underscores remain part of a term in query builder. Results may depend on SQLite tokenizer behavior. | FTS and prefix fallback cover common hyphen cases; substring fallback helps path/name misses. The packaged PDF miss was verified as truncated extracted text, not underscore query normalization. | Medium | Manual query checklist for `foo-bar`, `foo_bar`, and mixed file names. | Existing special-character tests plus manual. |
| Exact filename search | Exact filename should rank first, case-insensitively. | Exact filename boost now uses `LOWER(file_name) = LOWER(?)`. | High | Keep regression test. | Vitest added. |
| Partial filename search | Partial filename should work when FTS token prefix misses substring intent. | Prefix FTS handles token starts; new LIKE fallback handles filename/path substrings after FTS misses. | Medium | Keep fallback test. | Vitest added. |
| Path segment search | Relative path segments should be searchable. | FTS includes `relative_path`; fallback also checks path substring. | Medium | Keep existing path test. | Existing Vitest. |
| Multi-word content search | Terms should be ANDed, so all terms must match. | `toFtsQuery` quotes each term and joins with spaces. | Low | Existing test is sufficient. | Existing Vitest. |
| Phrase-like search | Quoted phrase input is tokenized into words, not treated as an exact phrase. | Quotes are stripped by tokenizer before FTS query construction. | Medium | Future product decision: exact phrase support or help text. | Existing no-crash coverage. |
| Short queries | One-character queries should not crash, but may be noisy. | Single-character query is quoted, not prefix-expanded. | Low | Keep no-crash test; consider minimum query UI hint later. | Existing Vitest. |
| Case-insensitive search | Content and filename search should be case-insensitive. | SQLite FTS is case-insensitive for ASCII by default; exact filename boost is now case-insensitive. | Medium | Manual non-ASCII case behavior check if needed. | Vitest added for exact filename boost. |
| Stale DB/FTS rows | Failed rereads/reparses, deletes, renames, and moves should remove stale FTS rows. | Scan removes FTS rows on parse/read failure and prunes missing paths; diagnostics expose last scan time and failure counts. | High | Keep stale-token regression tests. | Vitest added/existing. |
| Snippet quality | Body matches should show a short highlighted excerpt; filename/path fallback may have no snippet. | Search uses FTS `snippet()` for FTS hits and null snippets for fallback. | Medium | Manual review long documents and path/name-only searches. | Existing Vitest/Playwright for snippets. |
| Ranking where content-heavy files beat exact filename/path | Exact filename should win; filename/path weighted above body. | Weighted bm25 plus exact filename boost. | High | Keep exact/case-insensitive ranking tests. Consider path-exact boost later if needed. | Existing and added Vitest. |
| Dev web tests vs real packaged behavior | Web E2E proves React/sql.js flow, not native watchers, permissions, or bundled external tools. | E2E shim is deterministic and cannot prove OS integration. | High | Maintain a packaged manual smoke checklist before release. | Manual packaged required. |
| OneDrive/Dropbox online-only files | Placeholder files may be discovered but fail reads or parse slowly after hydration. | No explicit placeholder detection. Read failure becomes a read failure; discovery may abort as a root issue on metadata errors. | Medium | Manual packaged test with cloud-backed folders; future warning copy. | Manual packaged required. |
| Duplicate indexed roots or overlapping folders | Same absolute file path should not duplicate document rows. | `root_path` and `absolute_path` are unique; overlapping roots can update `folder_id` for same file. | Medium | Future UX decision on overlapping folders. | Manual recommended. |

## Packaged-App Manual Pass

Run these in a Windows installed build, not only `npm run dev:web`. The fastest path is to follow [`PACKAGED_WINDOWS_SMOKE_TEST.md`](PACKAGED_WINDOWS_SMOKE_TEST.md), which uses `scripts/stackdrop-packaged-smoke.ps1` to create and mutate the real filesystem corpus.

1. Index a real folder containing txt, selectable PDF, scanned PDF, DOCX, DOC, corrupt files, empty files, and unsupported files.
2. Create, edit, rename, move, and delete files while StackDrop is open with auto-index enabled.
3. Repeat the same changes with auto-index disabled, then click Index library.
4. Temporarily rename or disconnect an indexed root and confirm existing results remain with a clear root-specific warning.
5. Add a folder containing a permission-denied subfolder and confirm the app behavior is understandable.
6. Test a file larger than 50 MB and confirm it becomes a failed parse/read entry without stale content matches.
7. Test OneDrive/Dropbox online-only files if available.
8. Confirm bundled OCR and legacy `.doc` extraction work without relying on PATH-installed tools.
9. Compare query behavior for exact filename, partial filename, path segment, punctuation-heavy, hyphenated, underscored, short, multi-word, and phrase-like searches.
