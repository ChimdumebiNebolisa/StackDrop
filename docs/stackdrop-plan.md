# StackDrop Plan

Version: v1.3 (hardening + proof)
Status: Active — follow one step at a time
Date: 2026-05-12

---

## 1. Inputs reviewed

- **PRD** — [`stackdrop-prd.md`](stackdrop-prd.md) v1.3
- **Architecture** — [`stackdrop-architecture.md`](stackdrop-architecture.md) v1.3
- **Guardrails** — [`stackdrop-guardrails.md`](stackdrop-guardrails.md) v1.3

---

## 2. Facts

- v0 is archived on `main` with tag `v0-stackdrop-manual-import`.
- v1.1 shipped folder-based indexing for `.txt` / `.md` / `.pdf`.
- v1.2 adds **one-click library indexing**, **default roots**, **`.docx`**, **`app_health`**, and proof artifacts.
- v1.3 narrows supported types to **`.txt` / `.pdf` / `.docx` only**, adds **schema migration**, **scan transactions**, **logging**, and expanded **docs / proof** (API, DATABASE, ENV, SECURITY, PRODUCTION).

---

## 3. Must-have backlog (from PRD §2)

| ID | Capability |
|----|------------|
| MH-01 | Primary **Index library** scans all registered roots |
| MH-02 | Seed **Documents / Desktop / Downloads** when registry is empty |
| MH-03 | User can add optional folders; remove roots without deleting disk files |
| MH-04 | Recursive scan for **txt, pdf, docx** only |
| MH-05 | Parse/index with explicit parse status |
| MH-06 | Search by file name + content; filters: root, type, parse status |
| MH-07 | Detail view: path, metadata, preview, errors |
| MH-08 | Re-scan updates index; missing files removed from index |
| MH-09 | Visible scan lifecycle (idle / scanning / done / done with errors) |
| MH-10 | Local-only; no auth, cloud, AI |
| MH-11 | **app_health** Tauri command + documented TS service patterns |
| MH-12 | README + demo checklist + proof notes |

---

## 4. Kanban

**Active**

- None

**Backlog**

- Optional: extended human smoke on native OS pickers

**Done**

- v0 preservation; v1.1 steps STEP-V1-01–V1-07 (see prior execution record)
- STEP-V1-2-01–V1-2-06 (one-click + docx + proof)
- STEP-V1-3-01 (v1.3 hardening: core types, migrations, transactions, docs, proof screenshots)

**Blocked**

- None

---

## 5. Step definitions (v1.2)

### STEP-V1-2-01 — Documentation v1.2

**Objective**
Align root markdown docs with one-click UX, default roots, docx/doc policy, health model.

**Verification**
Editorial review against PRD checklist.

---

### STEP-V1-2-02 — Schema + migration for `docx`

**Objective**
Extend `indexed_documents.file_extension` constraint; migrate existing DBs safely.

**Verification**
`npm run test` (migration + repository tests)

---

### STEP-V1-2-03 — Rust: defaults + health + discovery

**Objective**
Add `get_default_document_roots`, `app_health`, extend `discover_supported_files` for `docx` only (not `doc`). Add `dirs` dependency. Tests for discovery.

**Verification**
`cargo test`

---

### STEP-V1-2-04 — Parsing + orchestration

**Objective**
`mammoth` for `.docx` in `parseFileContent`; `ensureDefaultLibraryRoots`, `runAllFolderScans`; wire `ensureDefaultLibraryRoots` after migrations when Tauri available.

**Verification**
`npm run test` (integration + unit)

---

### STEP-V1-2-05 — UI + e2e

**Objective**
Primary **Index library** button, scan status, optional secondary controls; Playwright updated for new flow + E2E shim hooks for default roots.

**Verification**
`npm run typecheck`, `npm run test:e2e`

---

### STEP-V1-2-06 — README + proof pack

**Objective**
Root `README.md`, `docs/DEMO_CHECKLIST.md`, `docs/PROOF.md` (screenshot instructions / artifact list).

**Verification**
Manual review; Playwright screenshot generation optional via `npm run test:e2e -- --update-snapshots` or documented steps.

---

## 6. Execution record

| Date | Step | Verification | Result |
|------|------|--------------|--------|
| 2026-05-12 | STEP-V1-01–V1-07 | typecheck / vitest / playwright / cargo | Pass |
| 2026-05-12 | STEP-V1-2-01–V1-2-06 | typecheck / vitest / playwright / cargo | Pass |
| 2026-05-12 | STEP-V1-3-01 | typecheck / vitest / playwright / cargo | Pass |

---

## 7. Native picker note

Automated tests mock Tauri `invoke` via `VITE_E2E_SQLITE=1` and `window.__STACKDROP_E2E__`. Real OS dialogs remain optional human smoke.
