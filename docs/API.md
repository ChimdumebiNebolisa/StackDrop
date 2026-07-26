# StackDrop command and service surface

StackDrop is a **Tauri desktop app**. There is **no REST API**. The boundary is **Tauri commands** (Rust) invoked from TypeScript, plus **TypeScript services** that orchestrate SQLite.

## Tauri commands (Rust)

Registered in [`src-tauri/src/main.rs`](../src-tauri/src/main.rs). Filesystem commands are implemented in [`src-tauri/src/commands/file_commands.rs`](../src-tauri/src/commands/file_commands.rs); summary commands are implemented separately in [`src-tauri/src/commands/summary_commands.rs`](../src-tauri/src/commands/summary_commands.rs).

| Command | Input | Output | Validation / errors |
|---------|--------|--------|---------------------|
| `open_folder_dialog` | _(none)_ | `Option<String>` folder path or `null` if cancelled | Uses dialog plugin; path normalized to existing directory |
| `get_default_document_roots` | _(none)_ | `DefaultDocumentRootDto[]` `{ label, path }` | Skips missing dirs; dedupes paths |
| `discover_supported_files` | `{ rootPath: string }` | `DiscoveredFileDto[]` | **Rejects empty/whitespace `rootPath`**; canonicalizes; errors if not a directory |
| `read_file_bytes_under_root` | `{ rootPath, absolutePath }` | `number[]` bytes | **Rejects empty paths**; enforces canonical containment + size cap in `path_utils` |
| `app_health` | _(none)_ | `{ ok: boolean, packageVersion: string }` | Always succeeds when shell loads |
| `save_openai_api_key` | `{ apiKey: string }` | `{ configured, persistence }` | Native-only write; rejects blank or oversized values; never returns the key |
| `has_openai_api_key` | _(none)_ | `{ configured, persistence }` | Reports presence only; never returns the key |
| `remove_openai_api_key` | _(none)_ | `{ configured, persistence }` | Idempotent native credential removal |
| `summarize_document` | `{ request: SummaryRequest }` | validated structured summary | Native credential lookup, bounded input validation, per-document duplicate guard, fixed safe error codes |

### Invoke examples (TypeScript)

Prefer the typed wrappers in [`src/features/folders/services/tauriFolderFs.ts`](../src/features/folders/services/tauriFolderFs.ts).

```typescript
import { invoke } from "@tauri-apps/api/core";

const roots = await invoke<Array<{ label: string; path: string }>>("get_default_document_roots");
const files = await invoke<Array<{ absolutePath: string; fileName: string; extension: string }>>(
  "discover_supported_files",
  { rootPath: roots[0].path },
);
const bytes = await invoke<number[]>("read_file_bytes_under_root", {
  rootPath: roots[0].path,
  absolutePath: files[0].absolutePath,
});
```

## TypeScript services (application layer)

| Function | Responsibility |
|----------|----------------|
| `ensureDefaultLibraryRoots(client)` | If zero folders, insert OS default roots via `get_default_document_roots` |
| `runAllFolderScans(client)` | Sequential `runFolderScan` for every folder; aggregates counts |
| `runFolderScan(folderId, client)` | Discover → read → parse → SQLite + FTS; prune missing files |
| `addIndexedFolder` / `removeIndexedFolder` / `listIndexedFolders` | Root registry |
| `queryDocuments` / `getDocumentDetail` | Search + detail |
| `hasOpenAIApiKey` / `saveOpenAIApiKey` / `removeOpenAIApiKey` | Credential presence and mutation without saved-key retrieval |
| `prepareDocumentText` / `summarizeDocument` | Deterministic text bounding and the typed native summary boundary |

### Service example

```typescript
import type { SqlClient } from "../src/data/db/sqliteClient";
import { ensureDefaultLibraryRoots } from "../src/features/folders/services/ensureDefaultLibraryRoots";
import { runAllFolderScans } from "../src/features/folders/services/runAllFolderScans";

export async function refreshIndex(client: SqlClient) {
  await ensureDefaultLibraryRoots(client);
  return runAllFolderScans(client);
}
```

## Search parameters

Filters are optional: `folderId`, `extension` (one of the generated supported extensions from `src/shared/fileCapabilities.json`), `parseStatus` (`parsed_text` \| `parsed_ocr` \| `parse_failed`), `sort` (`relevance` \| `recent`). When search text is non-empty, sort is forced to `relevance` (weighted bm25 ranking: filename > path > body). Empty search text with filters lists documents sorted by `updated_at DESC`.

Search results include an optional `searchSnippet` with `<mark>` highlighted excerpts from the body.

## Error handling

- Tauri commands return `Result<_, String>` — errors surface as thrown strings in `invoke`.
- Services throw `Error` with readable messages (e.g. folder not found).
- Parse failures are **never silent**: stored as `failed` with `parse_error` and excluded from FTS body indexing.
- Summary commands return only typed codes such as `api_key_missing`, `invalid_api_key`, `rate_limited`, `network_error`, and `malformed_response`. They never return OpenAI response bodies, authorization headers, credential-store values, or filesystem paths.

## Summary trust boundary

The React layer can submit a newly entered key to `save_openai_api_key`, but it cannot read the stored credential. `summarize_document` retrieves the key in Rust and sends one fixed request to the OpenAI Responses API. The request contains the selected document's prepared extracted text and only `fileName`, `relativePath`, and `fileExtension`; it excludes the document ID, absolute path, root path, parse error, diagnostics, database state, and source file bytes. Response JSON is schema-constrained in the API request, validated in Rust, and validated again in TypeScript before rendering.
