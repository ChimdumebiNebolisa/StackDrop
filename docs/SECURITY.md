# Security notes (StackDrop)

StackDrop is **local-first**: no accounts, no cloud API, no AI calls in product code.

## Tauri capabilities

Default capability file: `src-tauri/gen/schemas/capabilities.json` (generated from Tauri config). Permissions are limited to:

- `core:default`, `dialog:default` — window + folder picker
- `sql:default`, `sql:allow-execute` — local SQLite via plugin
- `fs:allow-read-file`, `fs:allow-read-text-file` — scoped reads used by the plugin stack

Avoid widening to blanket `fs:default` unless there is a documented need.

## Filesystem safety

- **Discovery** walks only under the user-provided canonical root (`discover_supported_files`).
- **Reads** use `read_file_bytes_under_root`, which canonicalizes root and candidate and rejects paths that escape the root (`path_utils::assert_path_within_root`).
- **Empty paths** are rejected at the command boundary.

## SQL / FTS

- All dynamic values use bound parameters in repositories.
- FTS user text is passed as a bound `MATCH` parameter after deterministic tokenization in [`documentSearchRepository.ts`](../src/data/search/documentSearchRepository.ts).

## Secrets

- No `.env` secrets are required for core functionality. Keep `.env` out of git if you add local tooling keys.

## Dependency hygiene

- Run `npm audit` / `cargo audit` periodically in CI if you add network-facing tooling; the shipping app has no server surface.
