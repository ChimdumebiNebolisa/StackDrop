# StackDrop command and service surface

StackDrop is a **Tauri desktop app**. There is **no REST API**. The boundary is **Tauri commands** (Rust) invoked from TypeScript, plus **TypeScript services** that orchestrate SQLite.

## Tauri commands (Rust)

Registered in [`src-tauri/src/main.rs`](../src-tauri/src/main.rs), implemented in [`src-tauri/src/commands/file_commands.rs`](../src-tauri/src/commands/file_commands.rs).

| Command | Input | Output | Validation / errors |
|---------|--------|--------|---------------------|
| `open_folder_dialog` | _(none)_ | `Option<String>` folder path or `null` if cancelled | Uses dialog plugin; path normalized to existing directory |
| `get_default_document_roots` | _(none)_ | `DefaultDocumentRootDto[]` `{ label, path }` | Skips missing dirs; dedupes paths |
| `discover_supported_files` | `{ rootPath: string }` | `DiscoveredFileDto[]` | **Rejects empty/whitespace `rootPath`**; canonicalizes; errors if not a directory |
| `read_file_bytes_under_root` | `{ rootPath, absolutePath }` | `number[]` bytes | **Rejects empty paths**; enforces canonical containment + size cap in `path_utils` |
| `app_health` | _(none)_ | `{ ok: boolean, packageVersion: string }` | Always succeeds when shell loads |

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

Filters are optional: `folderId`, `extension` (`txt` \| `pdf` \| `docx`), `parseStatus` (`indexed` \| `failed`), `sort` (`relevance` \| `recent`). Empty search text with filters lists documents (repository path).

## Error handling

- Tauri commands return `Result<_, String>` — errors surface as thrown strings in `invoke`.
- Services throw `Error` with readable messages (e.g. folder not found).
- Parse failures are **never silent**: stored as `failed` with `parse_error` and excluded from FTS body indexing.
