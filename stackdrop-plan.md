# StackDrop Plan

Version: v1.1 (folder indexing)  
Status: Active — follow one step at a time  
Date: 2026-05-12

---

## 1. Inputs reviewed

- **PRD** — `stackdrop-prd.md` v1.1 (folder indexing), dated 2026-05-12  
- **Architecture** — `stackdrop-architecture.md` v1.1, dated 2026-05-12  
- **Guardrails** — `stackdrop-guardrails.md` v1.1, dated 2026-05-12  

---

## 2. Facts

- v0 is preserved as git commit `Archive current manual-import app as StackDrop v0` and tag `v0-stackdrop-manual-import` on `main` (verify locally with `git tag` / `git log` after clone).
- v1 replaces the manual note/link/file-import product with **user-selected folder indexing** for `.txt` / `.md` / `.pdf` only.
- Notes/links are **out of scope** except optional future **legacy migration** (not in this plan’s must-haves).

---

## 3. Must-have backlog (from PRD §2)

| ID | Capability |
|----|------------|
| MH-01 | Add one or more folders to StackDrop |
| MH-02 | Remove a folder from StackDrop without deleting disk files |
| MH-03 | Recursive scan for supported files under each folder |
| MH-04 | Parse/index `.txt`, `.md`, `.pdf` with explicit parse status |
| MH-05 | Do not index unsupported types as searchable documents |
| MH-06 | Index file name, paths, extension, size, modified time, extracted text when available |
| MH-07 | Search by file name and indexed content |
| MH-08 | Filter by folder, file type, parse status |
| MH-09 | Manual re-scan |
| MH-10 | Document detail view (metadata + preview + errors) |
| MH-11 | Local-only: no auth, no cloud, no AI |

---

## 4. Kanban

**Active**

- None (initial v1 implementation pass complete)

**Backlog**

- Optional: native OS folder picker human smoke on desktop

**Done**

- v0 preservation (commit + tag + push) — evidence: git history on `main`
- STEP-V1-01 through STEP-V1-07 — see §6 execution record

**Blocked**

- None

---

## 5. Step definitions

### STEP-V1-01 — Schema + migration to v1 document index

**Objective**  
Replace v0 tables with v1 schema: `indexed_folders`, `indexed_documents`, `document_search` (FTS5), optional `scan_runs`. Migration must `DROP` legacy v0 tables if present so `CREATE IF NOT EXISTS` does not leave stale shapes.

**Dependencies**  
None.

**Verification**

- `npm run typecheck`
- `npm run test` (update or add repository migration tests)

**Exit criteria**  
Tests pass; new schema creates FTS; old tables removed on migrate.

---

### STEP-V1-02 — Tauri: folder picker + safe discovery + safe read

**Objective**  
Add `open_folder_dialog`, `discover_supported_files`, and `read_file_bytes_under_root` (names illustrative) with canonicalization and **root containment** checks. Register commands in `main.rs`.

**Dependencies**  
STEP-V1-01.

**Verification**

- `cargo test`
- `npm run typecheck`

**Exit criteria**  
Rust tests cover non-directory rejection, nested discovery fixture, and path traversal rejection.

---

### STEP-V1-03 — Repositories + document search layer

**Objective**  
Implement `FolderRepository`, `DocumentRepository`, and `DocumentSearchRepository` (FTS insert/delete; parameterized `MATCH`; reuse safe FTS query normalization pattern).

**Dependencies**  
STEP-V1-01.

**Verification**

- `npm run test` for CRUD + FTS query + filters

---

### STEP-V1-04 — Scan orchestration (manual)

**Objective**  
Service: given `folderId`, load `rootPath`, call discovery command, upsert documents, parse bytes, set `parse_status`, sync FTS, delete DB rows for files no longer present under root after successful scan (document rule in code comments + tests).

**Dependencies**  
STEP-V1-02, STEP-V1-03.

**Verification**

- Integration tests with temp dirs and real `.txt`/`.md`/`.pdf` bytes (reuse parser fixtures)

---

### STEP-V1-05 — Remove v0 UI/features; add v1 UI (folders, list, detail, search)

**Objective**  
Remove note/link/tag/collection flows. Add UI for folder list/add/remove/rescan, document list with filters, detail screen, search.

**Dependencies**  
STEP-V1-04.

**Verification**

- `npm run typecheck`
- `npm run test:e2e` (rewrite Playwright to folder flows; keep `VITE_E2E_SQLITE` shims as needed)

---

### STEP-V1-06 — Capabilities + security pass

**Objective**  
Confirm Tauri capability set remains minimal; document any required additions. Run targeted vibe-security checklist on path + SQL surfaces.

**Dependencies**  
STEP-V1-02, STEP-V1-03.

**Verification**

- Manual review + grep for remote/auth/AI imports
- `cargo test` / `npm run test`

---

### STEP-V1-07 — Final verification

**Objective**  
Run full suite: `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` (if configured), `cargo test`. Map results to PRD acceptance themes.

**Dependencies**  
STEP-V1-05, STEP-V1-06.

**Exit criteria**  
All green; any manual-only gap (e.g. native OS folder picker click) documented explicitly as partial with reason.

---

## 6. Execution record

| Date | Step | Verification | Result |
|------|------|--------------|--------|
| 2026-05-12 | STEP-V1-01–V1-07 | `npm run typecheck` | Pass |
| 2026-05-12 | STEP-V1-01–V1-07 | `npm run test` (Vitest) | Pass — 4 tests |
| 2026-05-12 | STEP-V1-05/07 | `npm run test:e2e` (Playwright) | Pass — 4 tests |
| 2026-05-12 | STEP-V1-07 | `npm run build` | Pass |
| 2026-05-12 | STEP-V1-02/07 | `cargo test` in `src-tauri` | Pass — 5 tests |

**Notes**

- Legacy v0 SQLite tables are dropped on migration when an `items` table is detected (`migrate.ts`).
- Real native folder dialog opening is not automated; e2e uses `window.__STACKDROP_E2E__` shims under `VITE_E2E_SQLITE=1`.

---

## 7. Native picker / dialog note

Automated tests may mock Tauri `invoke`. A **one-time human smoke** on a developer machine for the real OS folder dialog remains optional evidence for “picker opened” but is not required to contradict automated boundary tests.
