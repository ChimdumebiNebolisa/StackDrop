# Security notes (StackDrop)

StackDrop is **local-first**: there are no accounts, and indexing, parsing, SQLite storage, FTS search, diagnostics, and file watching stay local. Its only remote product boundary is an optional summary request explicitly initiated for one selected document.

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

- OpenAI summaries use a user-provided key saved by native Rust code. On Windows it is stored in Windows Credential Manager as service `com.stackdrop.app`, account `openai-api-key`; non-Windows development builds use memory-only session storage and report that status.
- The saved key is never returned to React and is never stored in SQLite, `localStorage`, `sessionStorage`, Tauri Store, configuration files, or frontend environment variables.
- The native request places the key only in the HTTPS Authorization header. Errors and logs must never include the key, header, request dump, raw response body, or credential-store values.
- No `.env` secret is required. Never put an API key in `VITE_*` because Vite values are shipped in the frontend bundle.

## OpenAI summary boundary

- One request is made only after the user opens one indexed document, chooses **Summarize**, then chooses **Generate summary**.
- Only bounded prepared extracted text plus filename, relative path, and extension are sent. Absolute paths, folder roots, parse errors, diagnostics, database contents, unrelated documents, source-file bytes, and the API key as model input are excluded.
- Document metadata and content are treated as untrusted data. Native developer instructions tell the model to ignore instructions inside the document and use only the supplied document.
- Requests use a fixed HTTPS origin, disabled redirects, finite timeouts, `store: false`, no tools, and strict structured output. Rust and TypeScript validate the response before the UI renders it.
- Automated tests use in-memory E2E hooks and never call Windows Credential Manager or OpenAI.

## Dependency hygiene

- Run `npm audit` / `cargo audit` periodically in CI. The shipping app has no server surface, but the native summary client is network-facing.
