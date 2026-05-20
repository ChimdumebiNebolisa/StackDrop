# StackDrop Search Accuracy Plan

## 1. Current Repo Findings

### Search flow: UI → service → repository

1. **UI** (`src/features/documents/screens/DocumentLibraryScreen.tsx`):
   - Maintains `searchText` state from an `<input>` element.
   - Constructs `filters` with `sort: "recent"` hard-coded.
   - Calls `queryDocuments(client, searchText, filters)` on every change to `searchText`, `filters`, or `dataVersion`.

2. **Service** (`src/features/documents/services/queryDocuments.ts`):
   - Trims input. If empty → delegates to `DocumentRepository.listDocuments(filters)`.
   - Otherwise → delegates to `DocumentSearchRepository.searchDocuments(trimmed, filters)`.

3. **Repository** (`src/data/search/documentSearchRepository.ts`):
   - `toFtsQuery(input)`: splits on non-alphanumeric chars (unicode-aware), wraps each token in double-quotes (escaping internal `"` as `""`), joins with space (implicit AND in FTS5).
   - Builds SQL: `SELECT d.* FROM document_search s JOIN indexed_documents d ON s.document_id = d.id WHERE document_search MATCH ? [AND filters] ORDER BY ...`
   - Ordering: `filters.sort === "recent"` → `d.updated_at DESC`; else → `bm25(document_search), d.updated_at DESC`.
   - Returns `IndexedDocumentRecord[]` (no snippets, no highlights, no score metadata).

### How documents are indexed into FTS

In `runFolderScan.ts`, after successful parse:
```typescript
await searchRepo.indexDocument(id, file.fileName, parsed.extractedText ?? "");
```

`indexDocument` deletes existing row first, then inserts `(document_id, file_name, body)`.

### Exact current FTS schema

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS document_search USING fts5(
  document_id UNINDEXED,
  file_name,
  body
);
```

Two indexed columns: `file_name` (column 0) and `body` (column 1).

### How filters are applied

Filter clauses are appended as `AND d.folder_id = ?`, `AND d.file_extension = ?`, `AND d.parse_status = ?` after the `MATCH` clause. Applied on the joined `indexed_documents` table, not the FTS table.

### How sorting currently works

- Default in the UI is `sort: "recent"` → `ORDER BY d.updated_at DESC`. Relevance sort uses `bm25(document_search), d.updated_at DESC`.
- The UI currently **hard-codes** `sort: "recent"` in the `filters` memo. There is no UI toggle to switch to relevance sort.

### Current snippet/highlight behavior

**None.** The search results list shows `d.fileName` and metadata badges. No search snippet or highlighted text is shown.

### Existing tests related to search/indexing

| File | Coverage |
|------|----------|
| `src/tests/unit/repositories.v1.test.ts` | Basic FTS insert + MATCH query for body content. |
| `src/tests/integration/folderScan.v1.test.ts` | Full scan pipeline: txt, docx, pdf text, pdf OCR, doc, rescan prune. Each test searches by content token via `queryDocuments`. |
| `src/tests/e2e/web-shell.spec.ts` | Searches for known tokens in each file type; tests watcher-driven create/modify/delete/rename. |

### Stale docs that must be corrected

| Doc | Issue |
|-----|-------|
| `docs/DATABASE.md` | Says `file_extension CHECK` is `txt \| pdf \| docx` (missing `doc`). Says `parse_status` is `indexed \| failed` (should be `parsed_text \| parsed_ocr \| parse_failed`). |
| `docs/API.md` | Says `extension` filter options are `txt \| pdf \| docx` (missing `doc`). Says `parseStatus` values are `indexed \| failed` (stale). |
| `docs/PROOF.md` | "Known limitations" says "no OCR in v1" and "No continuous file watcher" — both are now implemented. |
| `docs/ARCHITECTURE.md` (in docs/) | Extension list says `txt \| pdf \| docx` (missing `doc`). |
| `stackdrop-architecture.md` (root) | Same extension list issue. Also says parsing layer handles `.md` which is not supported. |

---

## 2. Recommended Approach

**Use SQLite FTS5 as the sole search engine.** Improve accuracy by:

1. Adding `relative_path` to the FTS table for path-based search.
2. Using weighted `bm25()` column boosts to rank filename matches above body matches.
3. Adding prefix matching (`term*`) to improve partial-word hits.
4. Adding a dedicated ranking query that favors filename exact/prefix matches.
5. Optionally surfacing `snippet()` for body content matches.
6. Switching the UI to `sort: "relevance"` when search text is non-empty, preserving `sort: "recent"` for empty browse.

**Why not Tantivy or external engines:** The current SQLite FTS5 setup is already functional. The problems are (a) no ranking differentiation between filename and body, (b) no path search, (c) no prefix matching, and (d) the UI hard-codes "recent" sort. These are all fixable within FTS5 + bm25 weights + minor SQL changes. Adding Tantivy would require a Rust search layer, IPC changes, and significant complexity for gains that don't justify the cost at this stage.

**Why not Fuse.js/MiniSearch:** After implementing prefix matching and weighted ranking in FTS5, the remaining gap is typo tolerance. For a document indexer where filenames and content are real words/tokens, FTS5 prefix matching covers the most common partial-input case. Typo tolerance is deferred to a future pass unless testing reveals a clear need. **Decision: Do not add a fuzzy library in this pass.**

---

## 3. File-by-File Change Plan

### `src/data/db/schema.sql`

**Change:** Add `relative_path` column to the FTS5 virtual table:
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS document_search USING fts5(
  document_id UNINDEXED,
  file_name,
  relative_path,
  body
);
```

**Reason:** Enable path-based search and weighted ranking where filename > path > body.

**Risk:** Existing databases have the old 2-column FTS table. Migration needed.

**Test coverage:** Migration test + search-by-path unit test.

---

### `src/data/db/migrate.ts`

**Change:** Add a new migration function `migrateFtsSchemaV2(client)` that:
1. Checks if `document_search` has the `relative_path` column (inspect `sqlite_master` for the virtual table's DDL or attempt a pragma-based check).
2. If not present: drop the old FTS table, recreate with the new schema, repopulate from `indexed_documents` (only rows with `parse_status IN ('parsed_text', 'parsed_ocr')`).
3. Call this new migration from `runMigrations` after the existing `migrateIndexedDocumentsSchema`.

**Reason:** Safe schema evolution for FTS virtual tables (FTS5 doesn't support ALTER TABLE).

**Risk:** FTS rebuild requires a full table scan of `indexed_documents`. For large libraries this could take seconds on first upgrade. Acceptable for a one-time migration.

**Test coverage:** New integration test in `src/tests/integration/migrate.fts-v2.test.ts`.

---

### `src/data/search/documentSearchRepository.ts`

**Change:**
1. Update `indexDocument` to accept and insert `relativePath`:
   ```typescript
   async indexDocument(documentId: string, fileName: string, relativePath: string, body: string): Promise<void>
   ```
2. Update `toFtsQuery` to add prefix matching: each term becomes `"term" OR term*` grouped in parentheses, joined with implicit AND.
   - Actually, simpler and safer: append `*` to the last token only (prefix-as-you-type pattern). All preceding tokens remain exact quoted terms.
   - Handle edge cases: single-char terms, pure-numeric terms.
3. Update the relevance `ORDER BY` to use column-weighted bm25:
   ```sql
   ORDER BY bm25(document_search, 10.0, 5.0, 1.0), d.updated_at DESC
   ```
   This gives `file_name` weight 10, `relative_path` weight 5, `body` weight 1.
4. Add a `searchDocumentsWithSnippets` method (or modify `searchDocuments` to optionally return snippets):
   ```sql
   SELECT d.*, snippet(document_search, 2, '<mark>', '</mark>', '…', 32) AS search_snippet
   ```
   Column index 2 = `body` (0-indexed: 0=document_id, 1=file_name, 2=relative_path, 3=body → actually with UNINDEXED, column indices for snippet may differ — verify at runtime).
5. Add safe fallback: if the FTS MATCH query throws (malformed query), catch error and return empty results or fall back to LIKE-based filename search.

**Reason:** Core of the search accuracy improvement.

**Risk:** `bm25()` weight arguments must match column count. `snippet()` column index must be verified. The `sql.js-fts5` WASM build and `better-sqlite3` both support FTS5 `bm25()` and `snippet()` but behavior should be integration-tested.

**Test coverage:** Updated and new unit tests for `toFtsQuery`, ranking order assertions, snippet output assertions.

---

### `src/features/documents/services/queryDocuments.ts`

**Change:**
1. When `searchText` is non-empty, force `sort: "relevance"` regardless of what the caller passes. This ensures typed searches rank by relevance.
2. When `searchText` is empty, use whatever `sort` the caller specifies (default: `"recent"`).
3. Optionally: accept a flag `includeSnippets?: boolean` and return an extended type.

**Reason:** The UI currently hard-codes `sort: "recent"` which defeats `bm25()` ranking when a search is active. This is the biggest current accuracy bug.

**Risk:** Low — purely additive logic.

**Test coverage:** Existing integration tests implicitly test this path; add an explicit test asserting relevance ordering.

---

### `src/domain/documents/types.ts`

**Change:** Add an optional `searchSnippet` field to a new interface or extend `IndexedDocumentRecord`:
```typescript
export interface SearchResultRecord extends IndexedDocumentRecord {
  searchSnippet?: string | null;
}
```

**Reason:** Keep `IndexedDocumentRecord` unchanged for non-search contexts. The search-specific result type adds the snippet.

**Risk:** None — additive type.

**Test coverage:** Type checking via `npm run typecheck`.

---

### `src/features/documents/screens/DocumentLibraryScreen.tsx`

**Change:**
1. Switch sort to `"relevance"` when `searchText.trim()` is non-empty in the `filters` memo. Keep `"recent"` when empty.
2. Update the document list item to render `searchSnippet` (if present) below the filename, using `dangerouslySetInnerHTML` for the `<mark>` tags (content is from SQLite snippet, not user input — safe).
3. Add a small CSS class for snippet rendering.

**Reason:** Makes the ranking improvement visible and adds snippet context to results.

**Risk:** `dangerouslySetInnerHTML` with SQLite-generated snippet is safe because content originates from the local FTS index, not external user input. Still, sanitize to only allow `<mark>` and `</mark>` tags as a defense-in-depth measure.

**Test coverage:** E2e test verifying snippet visibility after search.

---

### `src/features/folders/services/runFolderScan.ts`

**Change:** Update the `searchRepo.indexDocument` call to pass `relativePath`:
```typescript
await searchRepo.indexDocument(id, file.fileName, file.relativePath, parsed.extractedText ?? "");
```

**Reason:** Populates the new FTS column during indexing.

**Risk:** Low — just an additional argument.

**Test coverage:** Existing integration tests (will pass `relativePath` through the mock).

---

### `src/data/repositories/documentRepository.ts`

**Change:** In `deleteDocumentsNotInPaths`, the FTS cleanup already works (deletes by `document_id`). No change needed.

**Reason:** N/A.

**Risk:** None.

**Test coverage:** Existing rescan prune test.

---

## 4. Database and Migration Plan

### Schema changes

**Before:**
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS document_search USING fts5(
  document_id UNINDEXED,
  file_name,
  body
);
```

**After:**
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS document_search USING fts5(
  document_id UNINDEXED,
  file_name,
  relative_path,
  body
);
```

### Migration strategy

Add `migrateFtsSchemaV2(client: SqlClient)` in `migrate.ts`:

```typescript
async function migrateFtsSchemaV2(client: SqlClient): Promise<void> {
  // Check if migration is needed by inspecting the FTS table definition
  const row = await client.get<{ sql: string | null }>(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='document_search' LIMIT 1",
  );
  if (!row?.sql) return; // Table doesn't exist yet — schema.sql CREATE will handle it
  if (row.sql.includes("relative_path")) return; // Already migrated

  // Drop old FTS table and recreate with new schema
  await client.execute("DROP TABLE IF EXISTS document_search");
  await client.execute(`CREATE VIRTUAL TABLE document_search USING fts5(
    document_id UNINDEXED,
    file_name,
    relative_path,
    body
  )`);

  // Rebuild FTS from indexed_documents (only parsed docs)
  await client.execute(`INSERT INTO document_search (document_id, file_name, relative_path, body)
    SELECT id, file_name, relative_path, COALESCE(extracted_text, '')
    FROM indexed_documents
    WHERE parse_status IN ('parsed_text', 'parsed_ocr')`);
}
```

Call in `runMigrations` after `migrateIndexedDocumentsSchema(db)`:
```typescript
await migrateFtsSchemaV2(db);
```

### Backward compatibility

- Users with old app data: migration detects old schema and rebuilds. Data in `indexed_documents` is the source of truth; FTS is derived and safely rebuildable.
- Users with new app data: `CREATE VIRTUAL TABLE IF NOT EXISTS` in `schema.sql` creates the new schema directly.
- If migration fails mid-way: FTS table may be empty. Next scan will repopulate it. No data loss risk.

### FTS rebuild safety

The FTS table is entirely derived from `indexed_documents`. It can always be rebuilt from scratch by:
```sql
DELETE FROM document_search;
INSERT INTO document_search (document_id, file_name, relative_path, body)
  SELECT id, file_name, relative_path, COALESCE(extracted_text, '')
  FROM indexed_documents WHERE parse_status IN ('parsed_text', 'parsed_ocr');
```

---

## 5. Ranking and Query Plan

### Query building

New `toFtsQuery` logic:

```typescript
function toFtsQuery(input: string): string {
  const terms = input
    .split(/[^\p{L}\p{N}_]+/u)
    .map((t) => t.trim())
    .filter(Boolean);
  if (terms.length === 0) return "";

  // All terms except last: exact quoted match
  // Last term: prefix match (term*)
  const quoted = terms.slice(0, -1).map((t) => `"${t.replaceAll('"', '""')}"`);
  const last = terms[terms.length - 1].replaceAll('"', '""');
  const lastExpr = `("${last}" OR ${last}*)`;
  return [...quoted, lastExpr].join(" ");
}
```

This gives "search as you type" prefix behavior on the last token while keeping previous tokens exact.

### Ranking priority

Using `bm25(document_search, 10.0, 5.0, 1.0)`:
- Column 0 (`file_name`): weight 10 → filename matches dominate.
- Column 1 (`relative_path`): weight 5 → path matches rank above body.
- Column 2 (`body`): weight 1 → content matches rank lowest.

`bm25()` returns a negative number (lower = more relevant), so `ORDER BY bm25(...)` naturally sorts best-first.

### Additional exact-filename boost

For cases where the user types an exact filename, add a secondary sort signal:
```sql
ORDER BY
  CASE WHEN d.file_name = ? THEN 0 ELSE 1 END,
  bm25(document_search, 10.0, 5.0, 1.0),
  d.updated_at DESC
```

Where the `?` parameter is the raw trimmed search text. This ensures an exact filename match always appears first regardless of bm25 score.

### Fallback behavior

If `MATCH` throws an error (malformed FTS query from weird input):
1. Catch the error.
2. Fall back to a `LIKE`-based query: `WHERE d.file_name LIKE ? OR d.relative_path LIKE ?`.
3. Return results ordered by `d.updated_at DESC`.

### Sort modes

| Search text | Sort |
|-------------|------|
| Empty | `"recent"` (d.updated_at DESC) — browse mode |
| Non-empty | `"relevance"` (exact-name boost → bm25 → updated_at) |

The UI's sort preference is respected only when search is empty. When searching, relevance is always used. This change is enforced in `queryDocuments.ts`.

---

## 6. Snippet/Highlight Plan

### Decision: Use SQLite FTS5 `snippet()`

**Why `snippet()` over `highlight()`:** `snippet()` returns a truncated excerpt around the match (configurable token window), which is better for long document bodies. `highlight()` returns the entire column content with markers, which would be impractical for large bodies.

### Implementation

Add to the search query:
```sql
SELECT d.*,
  snippet(document_search, 2, '<mark>', '</mark>', '…', 32) AS search_snippet
FROM document_search s
JOIN indexed_documents d ON s.document_id = d.id
WHERE document_search MATCH ?
```

Column index for `snippet()`: In FTS5, column indices are 0-based over **all** columns including UNINDEXED. So:
- 0 = `document_id` (UNINDEXED)
- 1 = `file_name`
- 2 = `relative_path`
- 3 = `body`

Use column index **3** for body snippets.

### Type location

```typescript
// src/domain/documents/types.ts
export interface SearchResultRecord extends IndexedDocumentRecord {
  searchSnippet?: string | null;
}
```

### UI rendering

In `DocumentLibraryScreen.tsx`, below the filename in the document list:
```tsx
{d.searchSnippet && (
  <span className="search-snippet" dangerouslySetInnerHTML={{ __html: d.searchSnippet }} />
)}
```

Sanitize the snippet string to strip any tags except `<mark>` and `</mark>` before rendering.

### Breaking changes

None. `IndexedDocumentRecord` is unchanged. `SearchResultRecord` extends it. The search results state type changes from `IndexedDocumentRecord[]` to `SearchResultRecord[]` in the screen, but this is backward-compatible since `SearchResultRecord` is a superset.

---

## 7. Optional Fuzzy Search Plan

### Decision: Do not add Fuse.js or MiniSearch in this pass.

### Justification

1. **Prefix matching** (`term*`) handles the most common "partial input" case.
2. **Weighted bm25** handles the "wrong column matched" case.
3. **True typo tolerance** (edit distance) is a nice-to-have but not critical for a document indexer where users typically know what they're looking for.
4. Adding a fuzzy library means loading document metadata (filenames, paths) or content into memory. For large libraries (10k+ docs), this has memory implications.
5. The complexity of deduplicating fuzzy results against FTS results and managing two search paths is not justified by the marginal accuracy gain.

### Future consideration

If user feedback after this implementation shows frequent zero-result searches that a typo-tolerant engine would have resolved, consider:
- **MiniSearch** (preferred over Fuse.js for its indexing model and scored results).
- Run only when FTS returns 0 results.
- Index only `file_name` + `relative_path` (not body) to keep memory bounded.
- Deduplicate by `document_id`.

This is explicitly deferred to a future pass.

---

## 8. Test Plan

### Updated test files

#### `src/tests/unit/repositories.v1.test.ts`

Add tests:
- **"FTS search ranks filename match above body-only match"**: Index two docs — one where query matches filename, one where it matches body only. Assert filename match is first.
- **"FTS search finds document by relative_path"**: Index a doc and search by a path segment. Assert hit.
- **"prefix match works for partial last token"**: Search `"hel"` finds doc with `"hello world"` body.
- **"multi-word search finds documents"**: Search `"hello world"` finds correct doc.
- **"quoted input does not crash"**: Search `'he said "hello"'` doesn't throw.
- **"empty search returns empty from searchDocuments"**: Verify empty `toFtsQuery` returns `""` and fallback to list.
- **"special characters do not crash"**: Search `"@#$%^&*()"` returns empty, no error.
- **"single character search works"**: Search `"a"` returns results without crash.
- **"snippet is returned for body match"**: If snippet method is used, verify `search_snippet` contains `<mark>`.

#### `src/tests/integration/migrate.fts-v2.test.ts` (new file)

Tests:
- **"migrates old 2-column FTS to 3-column FTS"**: Create old schema, insert data, run migrations, verify `relative_path` is searchable.
- **"migration is idempotent"**: Run twice, no error.
- **"fresh database gets new schema directly"**: Run migrations on empty DB, verify structure.

#### `src/tests/integration/folderScan.v1.test.ts`

Update:
- **Existing tests pass without modification** (the `indexDocument` call gets a new parameter, but mocks adjust automatically since it flows through the real `DocumentSearchRepository`).
- **Add test "search by relative path finds document"**: After scan, search by path segment.

#### `src/tests/e2e/web-shell.spec.ts`

Add:
- **"search snippet visible for content match"**: After indexing, search by body token, verify `.search-snippet` element appears with `<mark>` tag.
- **"relevance sort: filename match ranks above body match"**: Index two files — one named "token.txt" and one with "token" in body. Search "token", verify order.

### Test checklist summary

| # | Test | File | New/Update |
|---|------|------|-----------|
| 1 | Body search finds documents | `repositories.v1.test.ts` | Existing (passes) |
| 2 | Filename search finds documents | `repositories.v1.test.ts` | New |
| 3 | Exact filename match ranks above body-only | `repositories.v1.test.ts` | New |
| 4 | Filename prefix match works | `repositories.v1.test.ts` | New |
| 5 | Relative path search works | `repositories.v1.test.ts` | New |
| 6 | Multi-word query works | `repositories.v1.test.ts` | New |
| 7 | Unsafe/quoted/weird input doesn't crash | `repositories.v1.test.ts` | New |
| 8 | Folder filter still works | `folderScan.v1.test.ts` | Existing (passes) |
| 9 | Extension filter still works | e2e | Existing (passes) |
| 10 | Parse-status filter still works | e2e | Existing (passes) |
| 11 | Recent sort still works (empty search) | `repositories.v1.test.ts` | New |
| 12 | Deleted document removed from search | `folderScan.v1.test.ts` | Existing (passes) |
| 13 | Updated document replaces old text | e2e (watcher test) | Existing (passes) |
| 14 | Snippets returned for body match | `repositories.v1.test.ts` | New |
| 15 | FTS migration from old schema | `migrate.fts-v2.test.ts` | New |

---

## 9. Documentation Plan

**Rule: Do not update docs until implementation and tests pass.**

After verification:

### `docs/DATABASE.md`

- Fix `file_extension` CHECK to include `doc`.
- Fix `parse_status` values to `parsed_text | parsed_ocr | parse_failed`.
- Update `document_search` FTS5 schema to show 3 indexed columns: `file_name`, `relative_path`, `body`.
- Add note about `bm25()` weighted ranking and `snippet()`.

### `docs/API.md`

- Fix `extension` filter to include `doc`.
- Fix `parseStatus` values to `parsed_text | parsed_ocr | parse_failed`.
- Document that search with non-empty text always uses relevance sort.
- Document search snippet in results.

### `docs/PROOF.md`

- Remove "no OCR in v1" from known limitations (OCR is implemented).
- Remove "No continuous file watcher" from known limitations (watcher is implemented).
- Update "Next improvements" to remove snippet/highlight (now implemented).

### `docs/ARCHITECTURE.md` (in docs/)

- Fix extension list to `txt | pdf | docx | doc`.
- Update parsing layer to mention `.doc` via antiword.

### `stackdrop-architecture.md` (root)

- Fix extension list to `txt | pdf | docx | doc`.
- Remove `.md` from parsing layer (not supported).
- Add note about OCR fallback for scanned PDFs.

### `README.md`

- Add note about search ranking (filename > path > content).
- Mention search snippets in key features.
- Already accurate on OCR and file types; verify and leave as-is.

---

## 10. Verification Commands

```bash
# TypeScript type checking
npm run typecheck

# Unit + integration tests
npm run test

# Frontend build
npm run build

# End-to-end tests
npm run test:e2e

# Rust tests
cd src-tauri
cargo test
cd ..
```

### What to do if things go wrong

| Issue | Mitigation |
|-------|-----------|
| `bm25()` weight arguments behave differently in sql.js-fts5 vs better-sqlite3 vs tauri-plugin-sql | Integration tests use `better-sqlite3` which has native FTS5. E2E uses `sql.js-fts5`. If weights don't work in one runtime, use unweighted `bm25(document_search)` as fallback and rely on the CASE-based exact-name boost. |
| Migration breaks old DB state | Migration is safe: drops FTS (derived data), rebuilds from source-of-truth `indexed_documents`. If rebuild fails, FTS table is empty — next scan repopulates. |
| `snippet()` unsupported or returns unexpected format in sql.js-fts5 | Make snippet optional. If the call throws, catch and return `null` for `searchSnippet`. UI already handles null gracefully. |
| Fuzzy fallback hurts performance | N/A — not adding fuzzy in this pass. |
| E2E tests flaky due to indexing timing | The e2e shim is synchronous (no real filesystem). Timing issues would come from React state updates. Existing `waitForVisible` patterns handle this. If newly added snippet assertions are flaky, increase timeout to match existing 15s pattern. |

---

## 11. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| `bm25()` column weights not honored in sql.js-fts5 WASM build | Low (FTS5 standard) | Ranking degraded in e2e/web mode | Test in e2e; if broken, remove weights and rely on CASE boost |
| `snippet()` column index off-by-one with UNINDEXED columns | Medium | Wrong column snippeted or error | Integration test with known content; adjust index if needed |
| Large FTS rebuild during migration blocks UI on first upgrade | Low (few seconds for ~10k docs) | Momentary hang | Acceptable — one-time cost; could add progress indicator in future |
| Prefix matching (`*`) on short tokens produces too many results | Low | Results feel noisy | Only apply `*` to the last token; minimum 2 chars for prefix |
| CASE-based exact-name boost adds second parameter to query | Low | Parameter indexing bug | Careful parameterization in test |

---

## 12. Acceptance Criteria

All of the following must be true:

1. `npm run typecheck` passes with zero errors.
2. `npm run test` passes — all existing tests pass, plus new ranking/snippet/migration tests.
3. `npm run build` succeeds.
4. `npm run test:e2e` passes — including new snippet and ranking assertions.
5. `cd src-tauri && cargo test` passes (Rust is not changed, but must not regress).
6. Searching by **filename** ranks that document above a body-only match for the same query.
7. Searching by **relative path segment** returns the expected document.
8. **Prefix matching** on the last token works (typing "hel" finds "hello").
9. **Multi-word queries** work correctly (implicit AND).
10. **Malformed/special input** does not crash the app (returns empty or falls back gracefully).
11. **Snippets** appear in search results for body-content matches, with `<mark>` highlighting.
12. **Empty search** still shows all documents sorted by `updated_at DESC`.
13. **Filters** (folder, extension, parse status) continue to work with and without search text.
14. The FTS **migration** from old schema to new schema is tested and works for existing databases.
15. **Documentation** is updated to reflect accurate OCR support, watcher support, `.doc` support, new ranking, and snippets.
16. No new npm dependencies added (Fuse.js/MiniSearch explicitly deferred).
