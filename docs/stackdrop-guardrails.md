# StackDrop Guardrails

Version: v2.1.5
Status: Active
Date: 2026-05-12

## 1. Purpose

Enforceable rules for implementing StackDrop v1. A rule is valid only if it can be **checked** (code review, test, or command output).

## 2. Scope control

- No feature ships unless it is a **must-have** in [`stackdrop-prd.md`](stackdrop-prd.md) or promoted there first.
- If implementation discovers a missing requirement, **stop** and update the PRD before coding the behavior.
- Only **must-have** PRD items belong in the active plan in [`stackdrop-plan.md`](stackdrop-plan.md).

## 3. Boundary control

- **UI** must not recursively scan the filesystem or read arbitrary paths.
- **UI** must not write SQLite directly (use services / documented composition root).
- Path canonicalization and **root containment** for reads live in **Tauri** (or dedicated infra used only from services).
- No remote backend, auth, sync, or AI product path except the documented native OpenAI selected-document summary boundary.
- Indexing and search remain local. Summary transmission requires the explicit **Generate summary** action and is never automatic or background work.

## 4. Implementation rules

- No unrelated refactors.
- **No placeholder logic** on indexing, scan, persistence, or search success paths.
- **No silent parse failures** — `parse_status` / `parse_error` must reflect reality in DB and UI.
- **Never delete or mutate user files on disk** from StackDrop.
- Supported extensions in product code and schema: **`.txt`**, **`.pdf`**, **`.docx`**, **`.doc`** (stored as `txt` \| `pdf` \| `docx` \| `doc`).
- Repeat scans must not re-read or re-parse unchanged healthy files.
- Deterministic validation before heuristics (query normalization, path-under-root checks).
- Core flows expose **idle / scanning / completed / completed-with-errors** (or equivalent) where applicable.
- Summary credentials live only in native OS credential storage on Windows; never in SQLite, browser storage, configuration, or frontend environment variables.
- Summary requests send only bounded prepared extracted text from the selected document plus filename, relative path, and extension. Never send absolute paths, roots, parse errors, diagnostics, database contents, unrelated documents, or source-file bytes.
- External requests and credential storage are mocked in automated tests.

## 5. Verification rules

- Never claim a behavior works without a **verification artifact** (unit test, integration test, e2e, typecheck, logs, or documented manual checklist item).
- If verification is partial, state exactly what was and was not verified.

## 6. Indexing: required checks

### Root safety

- Default roots come from OS APIs and are canonical directories.
- User-added roots: canonicalize; reject non-directories; reject reads outside root.

### Recursive scan

- Fixtures prove nested discovery for supported extensions including **`.docx`**.

### Path containment

- `read_file_bytes_under_root` rejects traversal / paths outside canonical root (Rust tests).

### Parse status

- Tests for indexed success, failed parse, and stored errors.

### Index freshness

- Re-scan removes DB rows for files no longer on disk under that root; never deletes disk files.

### Remove folder

- Removing a root only removes app state (cascade); no host file delete APIs.

## 7. Search / SQL safety

- FTS `MATCH` uses bound parameters after deterministic normalization of user input; no raw concatenation of user text into SQL.

## 8. Security (Tauri + data)

- Review **capabilities** on every change — minimum necessary permissions.
- Review path traversal, SQL/FTS injection footguns, credential handling, prompt injection, response validation, and fixed-origin network behavior.

## 9. Health

- **No** decorative HTTP health endpoints for a desktop-only app.
- Use **Tauri `app_health`** (or equivalent) + optional in-app diagnostic composition in TS.

## 10. Definition of done (v1)

- PRD must-haves implemented and evidenced.
- README lists supported types (`.txt`, `.pdf`, `.docx`, `.doc`) and honest limitations.
- No guardrail violations on the checklist above.
