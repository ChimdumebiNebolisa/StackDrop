# StackDrop Guardrails

Version: v1.1 (folder indexing)  
Status: Active  
Date: 2026-05-12

## 1. Purpose

Enforceable rules for implementing StackDrop v1. A rule is valid only if it can be **checked** (code review, test, or command output).

## 2. Scope control

- No feature ships unless it is a **must-have** in the current `stackdrop-prd.md` or explicitly promoted there first.
- If implementation discovers a missing requirement, **stop** and update the PRD before coding the behavior.
- Only **must-have** PRD items belong in the active initial plan in `stackdrop-plan.md`.
- Should-have / nice-to-have are forbidden until all must-haves are verified.

## 3. Boundary control

- No ownership change (UI scanning disk, UI writing DB, parsing inside Tauri unrelated to IO) without an **Architecture** update first.
- **UI** must not recursively scan the filesystem or read arbitrary paths.
- **UI** must not write directly to persistence (no `SqlClient` / repositories from screens/hooks except the app composition root pattern documented in Architecture).
- **OS path policy** (canonicalize, directory vs file, root containment) lives in the **Tauri** layer or a dedicated infra module invoked only from services—not in presentational components.
- No remote backend, cloud SDK, auth, sync, or AI imports in product code paths.

## 4. Implementation rules

- No unrelated refactors.
- **No placeholder logic** in indexing, scan, persistence, or search paths (no fake FTS data, no “TODO” returns on success paths).
- **No silent parse failures**: failures must set `parse_status` / `parse_error` and must surface to the UI when that document is shown or listed.
- **No silent skips** where user expectation is “this path was considered”: unsupported extensions must not appear as `indexed`; optional scan summaries should report skipped counts deterministically.
- **Never delete or mutate user files on disk** from StackDrop v1 code paths.
- Deterministic validation before optional heuristics (e.g. normalize query → FTS string; validate path under root before read).
- Core flows expose **loading**, **success**, and **failure** states in the UI where applicable.

## 5. Verification rules

- Never claim a behavior works without a **verification artifact** (unit test, integration test, e2e, typecheck, lint, logs, or documented manual checklist item).
- A plan step is not done until its verification passes.
- If verification is partial, state exactly what was and was not verified.

## 6. Folder indexing: required checks

### Folder selection safety

- Canonicalize selected folder; reject non-directories; reject unreadable roots with explicit errors.

### Recursive scan correctness

- Integration or unit tests with a **fixture directory tree** proving nested discovery for `.txt`/`.md`/`.pdf`.
- Unsupported extensions present in fixtures must **not** become `indexed` searchable rows.

### Path normalization / containment

- Any `read_file_bytes_for_root(path, root)`-style API must reject paths outside the canonical root (tests include traversal attempts).

### Parse status

- Tests for: indexed success, failed parse on supported type, deterministic error strings or codes stored.

### Index freshness

- Document behavior in Plan: manual rescan replaces/updates rows for files still present; documents for deleted files are removed on rescan (explicit rule—must match implementation and tests).

### Unsupported files

- Not indexed as searchable content; never inserted into FTS as if parsed.

### Remove folder

- Deleting a folder registration **does not** call host file delete APIs; DB cascade removes documents only.

## 7. Search / SQL safety

- FTS queries must use **bound parameters** for user text after deterministic normalization (e.g. quoted term splitting); no string concatenation of raw user input into SQL beyond safe, internal `ORDER BY` switches.

## 8. Security integration (vibe-security relevant subset)

For each change touching **Tauri capabilities**, **path handling**, or **SQL/FTS**:

- Review capability grants—minimum necessary permissions.
- Review path traversal / canonicalization.
- Review SQL injection and MATCH injection footguns.
- Review secrets—none expected; `.gitignore` for env files; no `VITE_*` secrets pattern.

Critical/High issues on these surfaces must be resolved before claiming the related plan step done.

## 9. Reporting format (non-trivial steps)

Each implementation step reports: goal, facts, assumptions, files changed, verification commands + results, status (`done` / `partial` / `blocked`), remaining uncertainty.

## 10. Definition of done (v1)

- All PRD must-haves implemented and evidenced.
- No unresolved guardrail violations on the checklist above.
- No out-of-scope capabilities introduced without PRD change.
