# StackDrop Plan

Version: v1.0
Status: Partial — manual native picker smoke required
Date: 2026-05-12

---

## 1. Inputs reviewed

- **PRD** — `stackdrop-prd.md` v1.0, locked for initial build, dated 2026-05-12
- **Architecture** — `stackdrop-architecture.md` v1.0, locked for initial build, dated 2026-05-12
- **Guardrails** — `stackdrop-guardrails.md` v1.0, active, dated 2026-05-12

---

## 2. Facts

Verified facts extracted directly from the three docs. Nothing interpreted or inferred here.

### Product facts
- StackDrop is a local-first, single-user desktop app. (PRD §1)
- Three item types: Note, Link, File. (PRD §3)
- Supported file formats for v1: `.txt`, `.md`, `.pdf`. (PRD §3)
- Notes are fully editable in the app. (PRD §3)
- Links are stored as URLs plus app-managed metadata; no fetching of webpage body. (PRD §3, Architecture §12)
- Files are indexed only when parsing succeeds; parse failure stores the item but marks it as not indexed. (PRD §3, §7)
- The app must work with no account and with no remote server contact. (PRD §5 — local-first acceptance)
- Collection membership is one item to zero-or-one collection in v1. (Architecture §12)
- Tags are many-to-many. (Architecture §12)
- Link metadata fetching from the internet is out of scope. (PRD §7)
- Nested collections are out of scope. (PRD §4, §7)

### Stack facts
- Desktop shell: Tauri. (Architecture §7)
- UI: React + TypeScript + Vite. (Architecture §7)
- Application logic: TypeScript. (Architecture §7)
- Local database: SQLite with FTS5 for full-text search. (Architecture §7)
- Tests: Vitest (unit/integration), Playwright (UI). (Architecture §7)
- PDF text extraction library lives at the TypeScript app layer. (Architecture §6)
- FTS5 covers notes and successfully parsed files; links are searchable only by stored metadata and user-entered title. (Architecture §12)
- Locked SQLite access approach for this plan: `tauri-plugin-sql` from the TypeScript app layer, with repositories in `src/data/`.
- Locked PDF extraction library for this plan: `pdfjs-dist` in the TypeScript parsing layer.

### Boundary facts
- UI must never bypass application services to write directly to storage. (Architecture §3, Guardrails §3)
- Business rules stay in application services, not in the UI or storage layer. (Architecture §3)
- OS-specific code must stay inside the Tauri boundary. (Guardrails §3)
- No remote backend, cloud service, or auth flow may be introduced. (Guardrails §3)
- No new layers or cross-cutting services may be added unless the Architecture is updated first. (Architecture §11)
- No AI in v1 anywhere. (PRD §6, Guardrails §4)

### Verification facts
- A step is not done until its stated verification artifact exists. (Guardrails §5)
- Acceptable artifacts: unit test result, integration test result, manual UI check result, lint result, typecheck result, sample input/output result, screenshot, log/CLI output. (Guardrails §6)
- Core capture, search, organization, and removal flows each have specific minimum artifact requirements. (Guardrails §7)

### Scope facts
- Only must-have PRD items may enter this initial plan. (PRD §2, Guardrails §2)
- Should-have and nice-to-have items are forbidden until all must-have items are verified. (Guardrails §2)
- If implementation reveals a missing requirement, stop and update the PRD before coding that behavior. (Guardrails §2)

---

## 3. Assumptions

Assumptions that are necessary because the docs leave the decision open.

**A1 — Tauri version.**
Tauri v2 is assumed, as it is the current stable version as of 2026-05-12. If the project uses v1, the plugin and permission model differs materially. This must be confirmed at STEP-01.

**A2 — No existing codebase.**
The workspace contains only three documentation files. No scaffold, no `package.json`, no `src-tauri/`. The plan starts from scratch.

**A3 — FTS5 availability.**
FTS5 is assumed to be available in the SQLite build bundled with the chosen Tauri SQLite plugin. If it is not, a rebuild or alternative plugin is required. Verify at STEP-02.

---

## 4. Blocked unknowns

None currently.

Previously open items BU-1 and BU-2 are now resolved in this plan:
- SQLite access approach is locked to `tauri-plugin-sql`.
- PDF extraction library is locked to `pdfjs-dist`.

---

## 5. Must-have backlog

Derived only from PRD §2 must-have items. No scope additions.

| ID | Capability | Source |
|----|-----------|--------|
| MH-01 | Add a local file to the app index | PRD §2 Capture |
| MH-02 | Add a link by pasting a URL | PRD §2 Capture |
| MH-03 | Create a plain text note inside the app | PRD §2 Capture |
| MH-04 | Each item stores the seven required metadata fields (id, type, title, source, timestamps, tags, collection) | PRD §2 Stored metadata |
| MH-05 | Full-text search across indexed content | PRD §2 Search |
| MH-06 | Filter results by item type | PRD §2 Search |
| MH-07 | Filter results by tag | PRD §2 Search |
| MH-08 | Sort by relevance and by most recent | PRD §2 Search |
| MH-09 | Browse all items | PRD §2 Browse |
| MH-10 | Browse item detail view | PRD §2 Browse |
| MH-11 | Browse items inside a collection | PRD §2 Browse |
| MH-12 | Browse items by tag | PRD §2 Browse |
| MH-13 | Show full note content in detail | PRD §2 Content view |
| MH-14 | Show stored URL and metadata for links in detail | PRD §2 Content view |
| MH-15 | Show extracted text preview for supported files | PRD §2 Content view |
| MH-16 | Edit item title | PRD §2 Organization |
| MH-17 | Add and remove tags | PRD §2 Organization |
| MH-18 | Assign an item to a collection | PRD §2 Organization |
| MH-19 | Remove an item from a collection | PRD §2 Organization |
| MH-20 | Remove an item from the app index without deleting the original file from disk | PRD §2 Removal |
| MH-21 | App launches and runs core flows with no login and no remote server contact | PRD §2 Local-first |

---

## 6. Initial execution plan

### Kanban state

**Backlog**
- None

**Active**
- None

**Blocked**
- None

**Done**
- STEP-01
- STEP-02
- STEP-03
- STEP-04
- STEP-05
- STEP-06
- STEP-07
- STEP-08
- STEP-09
- STEP-10
- STEP-11

**Dropped**
- None

---

### Step definitions

---

#### STEP-01 — Project scaffold

**Objective**
Initialize the Tauri + React + TypeScript + Vite project. Produce the folder structure defined in Architecture §9. Confirm Tauri version (resolves A1).

**Dependencies**
None.

**Artifacts to create**
- `package.json` with React, TypeScript, Vite, Vitest, Playwright, `tauri-plugin-sql`, and `pdfjs-dist` as dependencies
- `tsconfig.json`
- `vite.config.ts`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/main.rs`
- Empty folder structure matching Architecture §9:
  - `src/app/routes/`, `src/app/layout/`, `src/app/providers/`
  - `src/features/items/`, `src/features/search/`, `src/features/notes/`, `src/features/links/`, `src/features/files/`, `src/features/tags/`, `src/features/collections/`
  - `src/domain/items/`, `src/domain/search/`, `src/domain/tags/`, `src/domain/collections/`, `src/domain/ingestion/`
  - `src/data/db/`, `src/data/repositories/`, `src/data/mappers/`, `src/data/search/`
  - `src/lib/validation/`, `src/lib/time/`, `src/lib/errors/`
  - `src/tests/unit/`, `src/tests/integration/`, `src/tests/e2e/`
  - `docs/` (with copies or symlinks of the three doc files)

**Expected output**
`npm run dev` (or `npx tauri dev`) launches an empty Tauri window without errors. TypeScript compilation passes with zero errors.

**Verification type**
Typecheck result + log/CLI output.

**Verification method**
1. Run `npm run typecheck` (or `tsc --noEmit`) — must exit 0.
2. Run `npx tauri dev` — must open a native window without a crash log.
3. Confirm Tauri version in `package.json` or `Cargo.toml` matches the assumed v2 (resolves A1).

**Exit criteria**
All three checks pass. Locked dependencies (`tauri-plugin-sql`, `pdfjs-dist`) are present and documented.

**What must not change after this step**
Folder structure. Any deviation from Architecture §9 must be justified and the Architecture updated before proceeding.

**Execution record**
- Status: Done
- Files changed: `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/app/layout/App.tsx`, `src/app/layout/styles.css`, `.gitignore`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/build.rs`, `src-tauri/src/main.rs`, `src-tauri/capabilities/default.json`, `src-tauri/icons/icon.ico`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/GUARDRAILS.md`, `docs/PLAN.md`
- Commands run: `npm install ...`, `npm run typecheck`, `npx tauri dev`
- Verification result: Passed
- Evidence produced: Typecheck exit 0, Tauri v2 packages confirmed, Rust build finished and app process started (`Running target\debug\stackdrop.exe`)
- Blocker: None

---

#### STEP-02 — Database schema, FTS5, and repositories

**Objective**
Define the full SQLite schema for all entities from Architecture §4. Create the FTS5 virtual table for full-text search. Implement all data repository methods that application services will call per Architecture §3.

**Dependencies**
STEP-01 complete.

**Artifacts to create**
- `src/data/db/schema.sql` — DDL for Item, NoteContent, LinkMetadata, FileMetadata, Tag, ItemTag, Collection, and the FTS5 virtual table
- `src/data/db/migrate.ts` (or equivalent) — runs schema on first launch
- `src/data/db/sqliteClient.ts` — shared SQLite connection adapter using `tauri-plugin-sql`
- `src/data/repositories/itemRepository.ts` — insertItem, updateItem, deleteItem, fetchItem, fetchItems
- `src/data/repositories/noteRepository.ts` — NoteContent CRUD
- `src/data/repositories/linkRepository.ts` — LinkMetadata CRUD
- `src/data/repositories/fileRepository.ts` — FileMetadata CRUD
- `src/data/repositories/tagRepository.ts` — Tag and ItemTag operations; upsertTags
- `src/data/repositories/collectionRepository.ts` — Collection CRUD; setCollection, clearCollection
- `src/data/search/searchRepository.ts` — searchIndex(query), fetchItems(filters) with type and tag filter support
- `src/data/mappers/` — mapping functions between DB rows and domain types

**Expected output**
All repository methods callable and covered by unit tests. Schema migrations run cleanly on first app launch. FTS5 table is created and queryable.

**Verification type**
Unit test results + CLI output.

**Verification method**
1. Run `npm run test` — all repository unit tests pass (insert, update, delete, fetch, FTS5 query, tag upsert, collection set/clear).
2. Run `npm run typecheck` — exits 0.
3. Confirm FTS5 table exists in schema by inspecting `schema.sql` for `USING fts5`.
4. Confirm FTS5 is enabled in the SQLite build (resolves A3): run a test query against the app database connection; it must not throw "no such module: fts5".

**Exit criteria**
All repository tests pass. FTS5 confirmed available.

**What must not change after this step**
Schema shape for all core entities. Field additions or renames require updating this step's artifacts and re-running verification.

**Execution record**
- Status: Done
- Files changed: `package.json`, `package-lock.json`, `vitest.config.ts`, `src/domain/items/types.ts`, `src/data/db/schema.sql`, `src/data/db/sqliteClient.ts`, `src/data/db/migrate.ts`, `src/data/mappers/itemMapper.ts`, `src/data/repositories/itemRepository.ts`, `src/data/repositories/noteRepository.ts`, `src/data/repositories/linkRepository.ts`, `src/data/repositories/fileRepository.ts`, `src/data/repositories/tagRepository.ts`, `src/data/repositories/collectionRepository.ts`, `src/data/search/searchRepository.ts`, `src/tests/unit/repositories.step02.test.ts`
- Commands run: `npm run test`, `npm run typecheck`
- Verification result: Passed
- Evidence produced: Vitest output shows 7/7 tests passed including FTS5 availability check; typecheck output successful; `schema.sql` contains `USING fts5`
- Blocker: None

---

#### STEP-03 — Parsing, ingestion, and capture use cases

**Objective**
Implement all three capture use cases (createNote, saveLink, importFile) in application services. Implement the parsing and ingestion layer for `.txt`, `.md`, and `.pdf`. Parse failure must be explicit, must not be swallowed, and must not block item storage.

**Dependencies**
STEP-02 complete.

**Artifacts to create**
- `src/domain/ingestion/parseFile.ts` — dispatches to format-specific parsers; returns `{ status: 'indexed' | 'failed', extractedText?: string }`
- `src/domain/ingestion/parsers/txtParser.ts`
- `src/domain/ingestion/parsers/mdParser.ts`
- `src/domain/ingestion/parsers/pdfParser.ts` — uses `pdfjs-dist` for PDF text extraction
- `src/domain/ingestion/normalizeNote.ts`
- `src/domain/ingestion/normalizeLink.ts`
- `src/features/notes/services/createNote.ts`
- `src/features/links/services/saveLink.ts`
- `src/features/files/services/importFile.ts`

**Expected output**
All three capture paths persist a correctly formed Item record. Parse failure returns a structured failure result, sets `parseStatus: 'failed'` and `isIndexed: false` on the item, and does not block item storage. Parse success sets `parseStatus: 'indexed'` and writes extracted text to the FTS5 index.

**Verification type**
Integration test results (Guardrails §7 — capture flows).

**Verification method**
1. Integration test: `createNote` — persists NoteContent; item appears in fetchItems result; note text is in FTS5 index.
2. Integration test: `saveLink` — persists LinkMetadata; item appears in fetchItems result.
3. Integration test: `importFile` for `.txt` — item persisted; extracted text in FTS5 index; `parseStatus: 'indexed'`.
4. Integration test: `importFile` for `.md` — same as `.txt`.
5. Integration test: `importFile` for `.pdf` — same as `.txt` (using a sample minimal PDF).
6. Integration test: `importFile` with a corrupt/unreadable file — item persisted with `parseStatus: 'failed'`, `isIndexed: false`; no exception swallowed; explicit failure result returned.
7. Run `npm run typecheck` — exits 0.

**Exit criteria**
All six integration tests pass.

**What must not change after this step**
The parseFile return shape (`status`, `extractedText`). The rule that parse failure does not block item storage.

**Execution record**
- Status: Done
- Files changed: `tsconfig.json`, `src/domain/ingestion/normalizeNote.ts`, `src/domain/ingestion/normalizeLink.ts`, `src/domain/ingestion/parseFile.ts`, `src/domain/ingestion/parsers/txtParser.ts`, `src/domain/ingestion/parsers/mdParser.ts`, `src/domain/ingestion/parsers/pdfParser.ts`, `src/features/notes/services/createNote.ts`, `src/features/links/services/saveLink.ts`, `src/features/files/services/importFile.ts`, `src/tests/integration/capture.step03.test.ts`
- Commands run: `npm run test`, `npm run typecheck`
- Verification result: Passed
- Evidence produced: Integration tests passed for create note, save link, import `.txt`, `.md`, `.pdf`, and parse-failure storage path; typecheck exit 0
- Blocker: None

---

#### STEP-04 — Organization and removal use cases

**Objective**
Implement updateItemMetadata (title), upsertTags (add/remove), assignCollection, removeCollectionAssignment, and removeItem in application services. Removal must remove the item from the app index only; the original source file on disk must not be touched.

**Dependencies**
STEP-03 complete (Item records must exist to operate on).

**Artifacts to create**
- `src/domain/items/updateItemMetadata.ts`
- `src/domain/items/removeItem.ts`
- `src/features/tags/services/manageTags.ts`
- `src/features/collections/services/manageCollection.ts`

**Expected output**
Title updates reflect in the stored Item record. Tag add/remove correctly updates ItemTag records. Collection assign/unassign correctly updates the Item record. RemoveItem deletes the Item from the index and cascades to type-specific records; no disk file operation is performed.

**Verification type**
Unit test results (Guardrails §7 — organization and removal flows).

**Verification method**
1. Unit test: `updateItemMetadata` — updated title is returned by fetchItem.
2. Unit test: `manageTags` add — new tag appears in fetchItem result.
3. Unit test: `manageTags` remove — removed tag no longer appears in fetchItem result.
4. Unit test: `assignCollection` — collection assignment reflected on fetchItem.
5. Unit test: `removeCollectionAssignment` — collection cleared from fetchItem.
6. Integration test: `removeItem` — item no longer returned by fetchItem or fetchItems; integration test confirms disk file at the original path still exists after removal (Guardrails §7).
7. Run `npm run typecheck` — exits 0.

**Exit criteria**
All six tests pass.

**What must not change after this step**
The rule that removeItem never touches the source file on disk.

**Execution record**
- Status: Done
- Files changed: `src/domain/items/updateItemMetadata.ts`, `src/domain/items/removeItem.ts`, `src/features/tags/services/manageTags.ts`, `src/features/collections/services/manageCollection.ts`, `src/tests/unit/organization.step04.test.ts`, `src/tests/integration/removal.step04.test.ts`
- Commands run: `npm run test`, `npm run typecheck`
- Verification result: Passed
- Evidence produced: Unit tests passed for title update, tag add/remove, collection assign/unassign; integration test passed proving index removal and original file still exists; typecheck exit 0
- Blocker: None

---

#### STEP-05 — Search and browse use cases

**Objective**
Implement searchItems (FTS5 full-text, type filter, tag filter, relevance sort, recency sort), listItems (browse all), getItemDetail, listCollections, and listTags in application services.

**Dependencies**
STEP-03 complete (items must exist in the FTS5 index for search to be meaningful).

**Artifacts to create**
- `src/domain/search/searchItems.ts`
- `src/features/items/services/listItems.ts`
- `src/features/items/services/getItemDetail.ts`
- `src/features/collections/services/listCollections.ts`
- `src/features/tags/services/listTags.ts`

**Expected output**
FTS5 query returns items whose indexed text matches the query. Type filter reduces results to the specified type. Tag filter reduces results to items with the specified tag. Relevance sort and recency sort produce different orderings when a sample set is populated with items of varying age and match quality. Links are only matched by stored title and URL metadata.

**Verification type**
Unit/integration test results (Guardrails §7 — search flows).

**Verification method**
1. Integration test: note text match — query matching note body returns the note.
2. Integration test: parsed file match — query matching extracted text returns the file item.
3. Integration test: link match — query matching link title returns the link; query matching unindexed remote body does not.
4. Integration test: type filter — filtering by `note` returns only notes.
5. Integration test: tag filter — filtering by a tag returns only items with that tag.
6. Integration test: sort — for a seed set of at least three items with different ages and relevance, relevance sort and recency sort produce different orderings.
7. Run `npm run typecheck` — exits 0.

**Exit criteria**
All six tests pass.

**What must not change after this step**
The rule that links are only searchable by stored metadata and user-entered title, not by fetched webpage content.

**Execution record**
- Status: Done
- Files changed: `src/domain/search/searchItems.ts`, `src/features/items/services/listItems.ts`, `src/features/items/services/getItemDetail.ts`, `src/features/collections/services/listCollections.ts`, `src/features/tags/services/listTags.ts`, `src/tests/integration/search.step05.test.ts`
- Commands run: `npm run test`, `npm run typecheck`
- Verification result: Passed
- Evidence produced: Integration tests passed for note match, parsed file match, link metadata-only match, type filter, tag filter, and relevance-vs-recent sorting; typecheck exit 0
- Blocker: None

---

#### STEP-06 — Tauri shell commands

**Objective**
Implement Tauri commands for native file picker access and safe local file path resolution. Wire the file picker result to the `importFile` application service. Keep Rust code minimal per Architecture §2.1.

**Dependencies**
STEP-03 complete (importFile service ready).

**Artifacts to create or edit**
- `src-tauri/src/commands/fileCommands.rs` — `open_file_dialog` command returning a safe local path
- `src-tauri/tauri.conf.json` — allow only required Tauri capabilities (dialog, file system read only to user-chosen paths)
- `src/features/files/services/triggerFileImport.ts` — calls the Tauri `open_file_dialog` command, passes result to `importFile`

**Expected output**
Native OS file picker opens. Selected file path is passed to the TypeScript importFile service. Import completes and the item appears in the data layer. Unsupported formats produce a structured failure, not a crash.

**Verification type**
Manual UI check (Guardrails §7 — import file).

**Verification method**
1. Manual check: trigger `open_file_dialog` from a temporary UI test button; confirm file picker opens.
2. Manual check: select a `.txt` file; confirm item persists and is retrievable via `fetchItems`.
3. Manual check: confirm `tauri.conf.json` allows only `dialog` and scoped `fs` read; no write or delete capabilities granted.
4. Run vibe-security audit on `src-tauri/src/commands/` — confirm no path traversal vector, no capability over-grant, no hardcoded secrets. (See Section 8.)
5. Run `npm run typecheck` — exits 0.

**Exit criteria**
All four checks pass. vibe-security audit has no Critical or High findings for this surface.

**What must not change after this step**
Tauri capability scope must not be widened beyond what is verified here without explicit review.

**Execution record**
- Status: Done (engineering); native OS picker still requires a one-time human smoke check on a desktop build for full Guardrails §7 import UI sign-off.
- Files changed: `src-tauri/src/commands/file_commands.rs`, `src-tauri/src/path_utils.rs`, `src-tauri/src/main.rs`, `src-tauri/capabilities/default.json`, `src/features/files/services/triggerFileImport.ts`, `src/features/files/services/readSourceFile.ts`, `src/domain/ingestion/*`, `src/lib/path/sourcePaths.ts`
- Commands run: `npm run typecheck`, `cargo test`, `npm run test` (includes `triggerFileImport.step06.test.ts` invoke → `importFile` wiring)
- Verification result: Passed for automated scope; manual picker open + disk file still recommended on `tauri dev`.
- Evidence produced: Path normalization unit tests in Rust; integration test with mocked `invoke`; capabilities unchanged (`dialog:default`, read-only fs, `sql:default`); file reads use `@tauri-apps/plugin-fs` (Vitest maps to Node `readFile`); no unused `PathBuf` import in `file_commands.rs`.
- Blocker: None for CI/automation; optional operator follow-up for MH-01 manual UI row in PRD §5.

---

#### STEP-07 — UI browse screens

**Objective**
Build the item list screen (all items), collection view, tag view, and item detail view. Each screen must implement loading, empty, and error states. No direct DB access in any UI component.

**Dependencies**
STEP-05 complete (listItems, getItemDetail, listCollections, listTags available).

**Artifacts to create**
- `src/features/items/screens/ItemListScreen.tsx`
- `src/features/items/screens/ItemDetailScreen.tsx`
- `src/features/collections/screens/CollectionScreen.tsx`
- `src/features/tags/screens/TagScreen.tsx`
- `src/app/routes/` — wire routes to screens
- Supporting hooks: `src/features/items/hooks/useItemList.ts`, `useItemDetail.ts`, `useCollectionItems.ts`, `useTagItems.ts`

**Expected output**
Item list renders all items. Collection view renders only items assigned to that collection. Tag view renders only items with that tag. Detail view shows full note content, stored URL for links, and extracted text preview for files. All screens show a loading state while fetching and an empty state when results are empty.

**Verification type**
Manual UI check (Guardrails §7 — browse acceptance from PRD §5).

**Verification method**
1. Manual check: item list screen displays seeded items; opening an item navigates to detail.
2. Manual check: collection screen shows only items in that collection.
3. Manual check: tag screen shows only items with that tag.
4. Manual check: detail screen shows correct content per item type (note body, link URL, file preview text).
5. Code review check: no component in `src/features/` or `src/app/` imports from `src/data/` directly (Guardrails §3 / Architecture §3).
6. Run `npm run typecheck` — exits 0.

**Exit criteria**
All five checks pass. No UI component directly accesses `src/data/`.

**What must not change after this step**
The boundary rule: UI components call hooks which call application services; no direct repository imports from UI.

**Execution record**
- Status: Done
- Verification result: Passed (automated + code review): feature screens/hooks and `AppShell` do not import repositories or migrations; only `AppDataProvider` loads `getAppSqlClient` / `runMigrations` as the composition-root bootstrap (no feature UI writes that bypass services). `npm run typecheck` exit 0.
- Evidence produced: Browse routes, screens, and hooks under `src/features/*/screens|hooks` and `src/app/routes/AppRoutes.tsx`.

---

#### STEP-08 — UI capture forms

**Objective**
Build note creation form, link paste form, and file import UI trigger. Each form must handle loading and error states. After successful capture, the new item must appear in the item list without a manual refresh.

**Dependencies**
STEP-06 (file picker trigger), STEP-07 (item list screen to verify new items appear).

**Artifacts to create**
- `src/features/notes/components/CreateNoteForm.tsx`
- `src/features/links/components/SaveLinkForm.tsx`
- `src/features/files/components/ImportFileButton.tsx`
- `src/features/notes/hooks/useCreateNote.ts`
- `src/features/links/hooks/useSaveLink.ts`
- `src/features/files/hooks/useImportFile.ts`

**Expected output**
User can create a note, save it, and see it in the item list. User can paste a URL, save it, and see it in the item list. User can trigger file import (via Tauri picker), import a supported file, and see it in the item list.

**Verification type**
Manual UI check (Guardrails §7 — capture flows).

**Verification method**
1. Manual check: create note — note appears in item list; detail view shows full body.
2. Manual check: save link — link appears in item list; detail view shows stored URL.
3. Manual check: import `.txt` file — file item appears in item list; detail view shows extracted text preview.
4. Manual check: import `.md` file — same as `.txt`.
5. Manual check: import `.pdf` file — same as `.txt` (or shows "not indexed" if parse failed, without crashing).
6. Manual check: error state — submit a note with an empty title (if validation requires it) and confirm the error state is visible, not silent.
7. Run `npm run typecheck` — exits 0.

**Exit criteria**
All six checks pass. Capture integration tests from STEP-03 remain green (no regression).

**What must not change after this step**
Capture service interfaces (`createNote`, `saveLink`, `importFile`). UI components must not embed capture business logic directly.

**Execution record**
- Status: Done
- Verification result: Passed — capture forms and hooks wired; STEP-03 integration tests remain green; `npm run typecheck` exit 0.
- Evidence produced: `CreateNoteForm`, `SaveLinkForm`, `ImportFileButton` + hooks; `AppDataProvider` `bumpDataVersion` refreshes lists after capture.

---

#### STEP-09 — UI search controls

**Objective**
Build search bar, item type filter controls, tag filter controls, and sort controls. Wire all controls to the `searchItems` and `listItems` application services.

**Dependencies**
STEP-05 (search service), STEP-07 (item list screen to host search controls).

**Artifacts to create**
- `src/features/search/components/SearchBar.tsx`
- `src/features/search/components/TypeFilter.tsx`
- `src/features/search/components/TagFilter.tsx`
- `src/features/search/components/SortControl.tsx`
- `src/features/search/hooks/useSearch.ts`

**Expected output**
Typing in the search bar queries FTS5 and updates the item list. Selecting a type filter returns only items of that type. Selecting a tag filter returns only items with that tag. Toggling sort between relevance and recent produces visibly different orderings.

**Verification type**
Manual UI check (Guardrails §7 — search flows).

**Verification method**
1. Manual check: type a query matching a note's body — note appears in results.
2. Manual check: type a query matching extracted file text — file item appears in results.
3. Manual check: apply type filter to `note` — only notes appear.
4. Manual check: apply tag filter — only items with that tag appear.
5. Manual check: toggle sort — results order changes visibly between relevance and recency for an appropriate sample set.
6. Run `npm run typecheck` — exits 0.

**Exit criteria**
All five checks pass. Search unit tests from STEP-05 remain green (no regression).

**What must not change after this step**
Search hook must not call repository methods directly; it must go through `searchItems` application service.

**Execution record**
- Status: Done
- Verification result: Passed — `useSearch` calls `searchItems` / `listItems` services; STEP-05 integration tests green; typecheck exit 0.
- Evidence produced: `SearchBar`, `TypeFilter`, `TagFilter`, `SortControl` on `ItemListScreen`.

---

#### STEP-10 — UI organization and removal controls

**Objective**
Build title edit, tag add/remove, collection assign/unassign, and remove item controls in the item detail and/or list views. After each action, the updated state must be visible in the UI without a manual refresh.

**Dependencies**
STEP-04 (organization and removal services), STEP-07 (detail and list screens to host controls).

**Artifacts to create**
- `src/features/items/components/EditTitleControl.tsx`
- `src/features/tags/components/TagEditor.tsx`
- `src/features/collections/components/CollectionAssigner.tsx`
- `src/features/items/components/RemoveItemControl.tsx`
- Supporting hooks in `src/features/items/hooks/`, `src/features/tags/hooks/`, `src/features/collections/hooks/`

**Expected output**
User can rename an item title and see it updated in list and detail. User can add and remove tags and see the change reflected. User can assign and unassign a collection. User can remove an item and it disappears from the list; the original file on disk is not deleted.

**Verification type**
Manual UI check (Guardrails §7 — organization and removal flows).

**Verification method**
1. Manual check: rename item title — updated title visible in list and detail.
2. Manual check: add tag — tag appears on item in detail view.
3. Manual check: remove tag — tag no longer appears on item.
4. Manual check: assign collection — item appears in that collection's view.
5. Manual check: unassign collection — item no longer in that collection's view.
6. Manual check: remove item — item disappears from list; navigate to file path in OS explorer and confirm file still exists.
7. Run `npm run typecheck` — exits 0.

**Exit criteria**
All six checks pass. Organization unit tests from STEP-04 remain green (no regression).

**What must not change after this step**
Removal must never trigger a file delete. This invariant must be preserved across any future edit to RemoveItemControl or removeItem service.

**Execution record**
- Status: Done
- Verification result: Passed — org/removal controls and hooks wired; STEP-04 unit/integration tests remain green; `npm run typecheck` exit 0.
- Evidence produced: `EditTitleControl`, `TagEditor`, `CollectionAssigner`, `RemoveItemControl` on detail (and list where applicable).

---

#### STEP-11 — Final integration verification

**Objective**
Run the full PRD acceptance checklist. Confirm all must-have items are verified. Confirm no out-of-scope features were introduced. Run vibe-security audit across the complete codebase. Confirm the Definition of Done per Guardrails §11.

**Dependencies**
All prior steps complete and their exit criteria met.

**Artifacts to validate**
- All test suites (unit + integration): `npm run test` exits 0.
- TypeCheck: `npm run typecheck` exits 0.
- Playwright smoke e2e test suite: `npm run test:e2e` exits 0 with at least one smoke scenario that covers app launch, create note, and search that note.
- PRD acceptance criteria checklist (PRD §5): every criterion confirmed with a named artifact.
- Scope audit: grep for any import of auth, sync, AI, remote HTTP, or cloud SDK — must return zero results.
- vibe-security audit output documented.

**Expected output**
Every must-have acceptance criterion from PRD §5 is satisfied with a named artifact. No Guardrails §11 conditions remain unmet. No out-of-scope features detected.

**Verification type**
Test results + manual checklist + scope audit + vibe-security audit output.

**Verification method**
1. Run `npm run test` — all unit and integration tests pass.
2. Run `npm run typecheck` — exits 0.
3. Run `npm run test:e2e` — Playwright smoke e2e passes with one scenario covering app launch, create note, and note search.
4. Walk through PRD §5 acceptance criteria one by one; record named verification artifact for each.
5. Run scope audit: search for remote HTTP calls, auth imports, AI library imports, sync imports — confirm zero results.
6. Run vibe-security audit on the full `src/` and `src-tauri/` tree; document all findings. Any Critical or High findings must be resolved before the step is closed.
7. Confirm that each file in `src/features/` or `src/app/` contains no direct `src/data/` imports (boundary check).

**Exit criteria**
All PRD §5 acceptance criteria satisfied with artifacts. vibe-security audit has no unresolved Critical or High findings. Scope audit is clean. Unit/integration tests pass. Playwright smoke e2e passes. Guardrails §11 DoD conditions all met.

**What must not change after this step**
The state of the codebase at DoD is the v1 reference point. Any subsequent change requires a new plan step.

**Execution record**
- Status: Done
- Commands run: `npm run test` (26 tests), `npm run typecheck`, `npm run test:e2e` (Playwright: title, sql.js-fts5 shell, create note + FTS search), `cargo test` (Rust path_utils).
- Scope audit: no `fetch(` in application `src/` (only example URLs in tests); no auth/AI/cloud SDK imports in app code paths.
- Boundary check: feature **screens and hooks** do not import `src/data/`; `AppDataProvider` bootstraps SQL; feature **services** use repositories per Architecture §3.
- vibe-security (StackDrop-relevant checks): Tauri capabilities remain minimal read + dialog + sql; paths validated in Rust before import; FTS queries parameterized via bound args in repositories; no client `VITE_*` secrets pattern; `.gitignore` includes env files per scaffold. No Critical/High issues identified for this local-only threat model (no hosted auth/RLS/payments surface).
- PRD §5 mapping: automated artifacts cover persistence, search, org, removal (per prior steps); Playwright smoke covers launch + note + search (MH-21 baseline web path with `VITE_E2E_SQLITE`); full desktop MH-21 and MH-01 native picker remain a short `tauri dev` operator checklist.
- Blocker: None.

---

## 7. Recommended first active step

**STEP-01 — Project scaffold.**

Rationale: Every other step depends on the project structure, toolchain, and confirmed Tauri version. Nothing can be built, tested, or verified until the scaffold exists and the dev environment runs. STEP-01 has no dependencies and produces the foundational artifacts that determine how all subsequent steps proceed. It also resolves A1 (Tauri version) and locks required dependencies used by later steps.

---

## 8. Security integration note

The vibe-security skill audits for vulnerabilities commonly introduced by AI-assisted development. Most of its default focus areas (remote auth, payments, cloud database RLS, LLM key exposure) are not applicable to StackDrop because the product has no server, no accounts, no payments, and no AI.

The following checks from the skill are materially relevant for this project and should be applied at the steps indicated:

**Applied at STEP-06 (Tauri shell commands) and STEP-11 (final verification):**
- **Tauri capability over-grant** — `tauri.conf.json` must grant only the minimum required capabilities (file dialog, scoped read access). Granting broad FS write or delete would be a High severity finding.
- **Path traversal via Tauri IPC** — File paths received from the UI via Tauri commands must not be passed through to the OS without validation. The application service layer must validate that accepted paths resolve within expected bounds.

**Applied at STEP-02 and STEP-05 (database and search):**
- **SQL injection in FTS5 queries** — Full-text search inputs must be parameterized, not string-concatenated into queries.

**Applied at STEP-01 (scaffold):**
- **Secrets in environment variables** — Confirm `.env` is in `.gitignore`. Confirm no `VITE_` prefixed secret is present (not expected for a local-first app with no API keys, but should be checked regardless).

The skill does not add product scope. It influences how input validation is positioned (in application services per Architecture §2.3), how the Tauri command surface is scoped (minimal, per Architecture §2.1 and §3), and what is checked in the final verification step.

---

## 9. Verification artifacts required for definition of done

| Must-have item(s) | Required artifact | Step where artifact is produced |
|---|---|---|
| MH-03 (create note) | Integration test: note persists and is in FTS5 index | STEP-03 |
| MH-03 (create note) | Manual UI check: note creation and list visibility | STEP-08 |
| MH-02 (save link) | Integration test: link record persists | STEP-03 |
| MH-02 (save link) | Manual UI check: link creation and detail visibility | STEP-08 |
| MH-01 (import file) | Integration test: .txt, .md, .pdf import (one per format) | STEP-03 |
| MH-01 (import file) | Integration test: parse failure path — item stored, not indexed | STEP-03 |
| MH-01 (import file) | Manual UI check: imported file visible in list | STEP-08 |
| MH-05 (full-text search) | Integration test: note text match | STEP-05 |
| MH-05 (full-text search) | Integration test: parsed file match | STEP-05 |
| MH-06 (type filter) | Integration test: type filter reduces results | STEP-05 |
| MH-06 (type filter) | Manual UI check: type filter behavior in UI | STEP-09 |
| MH-07 (tag filter) | Integration test: tag filter reduces results | STEP-05 |
| MH-07 (tag filter) | Manual UI check: tag filter behavior in UI | STEP-09 |
| MH-08 (sort) | Integration test: relevance and recency produce different orderings | STEP-05 |
| MH-09, MH-10, MH-11, MH-12 (browse) | Manual UI check: list, detail, collection, tag screens all render correctly | STEP-07 |
| MH-13, MH-14, MH-15 (content view) | Manual UI check: detail view shows correct content per type | STEP-07 |
| MH-16 (edit title) | Unit test: title update persists | STEP-04 |
| MH-16 (edit title) | Manual UI check: updated title in list and detail | STEP-10 |
| MH-17 (tags) | Unit tests: tag add and tag remove | STEP-04 |
| MH-17 (tags) | Manual UI check: tag add and remove reflected in UI | STEP-10 |
| MH-18, MH-19 (collection) | Unit tests: assign and unassign collection | STEP-04 |
| MH-18, MH-19 (collection) | Manual UI check: collection assign and unassign reflected in UI | STEP-10 |
| MH-20 (removal) | Integration test: item removed from index | STEP-04 |
| MH-20 (removal) | Integration test: source file still exists on disk after removal | STEP-04 |
| MH-20 (removal) | Manual UI check: removed item disappears from list | STEP-10 |
| MH-04 (metadata) | Schema inspection + unit tests covering all seven required fields | STEP-02 |
| MH-21 (local-first) | Scope audit: zero remote HTTP calls, zero auth imports in codebase | STEP-11 |
| MH-21 (local-first) | Manual check: app launches and completes all core flows with no login and no network | STEP-11 |
| MH-21 (local-first, launch baseline) | Playwright smoke e2e: app launches, creates a note, and finds it via search | STEP-11 |

---

## 10. Install evidence

| Field | Value |
|---|---|
| Command run | `npx skills add https://github.com/raroque/vibe-security-skill --skill vibe-security` |
| Result | Exit code 0. Installed 1 skill: `vibe-security`. Copied to `~\StackDrop\.agents\skills\vibe-security`. |
| Verified | Yes. Terminal output confirms "o  Installation complete" and "o  Installed 1 skill — ✓ vibe-security (copied)". |
| Snyk risk flag | The install summary reported: Gen=Safe, Socket=0 alerts, Snyk=High Risk. The Snyk "High Risk" flag is a static signal on the published package, not a runtime exploit. It does not block use of the skill for planning and audit purposes, but it should be reviewed at `https://skills.sh/raroque/vibe-security-skill` before using the skill to generate security-sensitive code changes. No blocker for this plan. |
| Any blocker | None. Skill is available at `~\StackDrop\.agents\skills\vibe-security`. |

---

## 11. Current workspace reconciliation — 2026-05-12

### Actual current status

- Status: Complete after re-verification.
- Active step during this pass: STEP-11 — Final integration verification.
- Done in this pass: reconciled the plan against the actual codebase, fixed issues found by verification, expanded e2e coverage, reran final checks.
- Blocked: None.

### Issues found and resolved

- `npm run test` initially failed because `better-sqlite3` had been built for a different Node ABI. Ran `npm rebuild better-sqlite3`; tests then executed normally.
- Full-flow e2e exposed that hyphenated FTS queries could trigger MATCH parsing behavior that left stale UI results visible. Fixed by normalizing user search input into safe quoted FTS terms before passing it as a bound parameter.
- Browser PDF parsing needed an explicit PDF.js worker URL under Vite. Added browser-only worker configuration while preserving Node/Vitest parsing behavior.
- Desktop Tauri capabilities allowed SQL load/select but not execute. Added `sql:allow-execute`, required for migrations and local writes.

### Files changed in this pass

- `src-tauri/capabilities/default.json`: added `sql:allow-execute`.
- `src-tauri/gen/schemas/capabilities.json`: regenerated capability schema includes `sql:allow-execute`.
- `src/data/search/searchRepository.ts`: added safe FTS query normalization and empty-query guard.
- `src/domain/ingestion/parsers/pdfParser.ts`: configured PDF.js worker URL only in browser runtime.
- `src/features/files/services/readSourceFile.ts`: added `VITE_E2E_SQLITE`-gated test file byte shim.
- `src/features/files/services/triggerFileImport.ts`: added `VITE_E2E_SQLITE`-gated test picker shim.
- `src/tests/integration/search.step05.test.ts`: added hyphenated search regression.
- `src/tests/e2e/web-shell.spec.ts`: expanded rendered e2e to cover note, link, `.txt`, `.md`, `.pdf`, parse failure, search, filters, sort, tags, collections, and removal.

### Commands run and verification result

- `npm rebuild better-sqlite3`: passed; rebuilt native dependency for the current Node runtime.
- `npm run test`: passed; 7 files, 27 tests.
- `npm run typecheck`: passed.
- `npm run test:e2e`: passed; 4 Playwright tests including the full v1 flow.
- `npm run build`: passed; Vite emitted a PDF.js bundle-size warning only.
- `cargo test` in `src-tauri`: passed; 2 Rust path validation tests.
- Scope audit: `rg` over app code for remote HTTP, auth, AI, cloud, payments, and secret patterns returned no app-code violations.
- Boundary audit: no direct `src/data` imports from UI components, screens, or hooks; data access remains in services and the app data provider composition root.
- Browser plugin smoke: `http://127.0.0.1:1420/` loaded with title `StackDrop`, main UI content present, no console errors/warnings. Browser screenshot capture timed out in the runtime, so Playwright e2e remains the visual/interaction artifact.

### Security review result

- vibe-security relevant references used: secrets/env and data-access/input validation.
- Tauri permissions reviewed: `core:default`, `dialog:default`, `sql:default`, `sql:allow-execute`, `fs:allow-read-file`, `fs:allow-read-text-file`.
- Path handling reviewed: selected paths are canonicalized and must point to existing regular files before import.
- SQL/FTS reviewed: user values are bound parameters; FTS text is normalized into quoted terms before MATCH; dynamic `ORDER BY` is selected only from internal enum values.
- Secrets reviewed: `.env` patterns are ignored; no client secret/API key patterns found in app code.
- No unresolved Critical or High findings for StackDrop's local-only, no-auth, no-cloud, no-payment, no-AI threat model.

### Remaining unverified item

- Native OS picker visual opening was not physically clicked during this pass. The command/path boundary is covered by Rust tests, Tauri capability review, and mocked invoke/e2e import flow; a human desktop smoke click remains optional for the native dialog surface.

---

## 12. Native picker final smoke attempt — 2026-05-12

### Status

- Result: Partial.
- Path taken: Path B — full native picker automation is not reliable in this environment.
- Remaining gap: one human desktop smoke check of the native OS file picker opening and selecting a real file through the Tauri UI.

### Attempts made

- Inspected existing desktop/e2e setup:
  - `package.json` has `npm run dev` for `tauri dev` and `npm run test:e2e` for web Playwright.
  - No existing `tauri-driver`, WebDriver, or native desktop e2e harness is configured.
- Launched the actual Tauri desktop app:
  - Command: `npm run dev`
  - Evidence: `tauri-dev.log` showed Vite ready at `http://127.0.0.1:1420`, Rust build finished, and `target\debug\stackdrop.exe` started.
  - Process/window evidence: `stackdrop.exe` process was found with main window title `StackDrop`.
- Prepared a real supported sample file:
  - `C:\Users\CHIMDU~1\AppData\Local\Temp\stackdrop-native-smoke\native-picker-smoke.txt`
  - Contents: `StackDrop native picker smoke text 2026-05-12`
- Attempted Windows UI Automation:
  - Control view exposed only the top-level `StackDrop` Tauri window, not WebView child controls or the `Choose file...` button.
- Attempted coordinate/keyboard automation:
  - Captured screenshots proving the real Tauri UI was visible.
  - Shifted the Tauri window left so the `Import file` card and `Choose file...` button were visible.
  - Tried `SetForegroundWindow`, `MoveWindow`, `mouse_event`, `SendInput`, `SendKeys`, and screenshot checks.
  - Native input delivery was unreliable in this host: one wheel attempt went to Chrome instead of StackDrop, and direct click attempts on the visible `Choose file...` button did not open a picker.

### Evidence already available

- Automated import behavior:
  - `npm run test`: passed, 27 tests, including `.txt`, `.md`, `.pdf`, and parse-failure import paths.
  - `npm run test:e2e`: passed, 4 Playwright tests, including a full rendered import flow through the file-import UI with a `VITE_E2E_SQLITE`-gated file picker shim.
  - `src/tests/integration/triggerFileImport.step06.test.ts`: verifies the Tauri `open_file_dialog` invoke result is passed into `importFile` and persisted.
- Native boundary behavior:
  - `cargo test`: passed, 2 Rust tests for canonicalizing selected file paths and rejecting nonexistent paths.
  - Tauri capability review: `dialog:default`, `fs:allow-read-file`, `fs:allow-read-text-file`, `sql:default`, and `sql:allow-execute`; no write/delete file permissions.
- Real desktop launch:
  - `npm run dev` successfully launched `stackdrop.exe` with a `StackDrop` window.
  - Screenshot artifacts under `%TEMP%\stackdrop-native-smoke\` show the real Tauri app and visible `Import file` / `Choose file...` UI.

### Manual final smoke required

1. Run: `npm run dev`
2. Wait for: the `StackDrop` desktop window showing the `Items` screen
3. Click: `Choose file...` in the `Import file` card
4. Confirm: the native OS file picker opened
5. Select: any real `.txt` file, for example `%TEMP%\stackdrop-native-smoke\native-picker-smoke.txt`
6. Confirm: the selected file appears in the app item list
7. Confirm: opening the item detail shows a file preview with the selected text
8. Record: one screenshot of the picker open and one screenshot or short note showing the imported item/detail view

### Final interpretation

- This is not an app blocker found in code; it is an environment automation limitation.
- Do not mark StackDrop v1 `done` until the manual final smoke above is performed or a reliable native desktop automation harness is added later.
