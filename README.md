# StackDrop

StackDrop is a **local-first desktop document indexer and search app** (Tauri + React + SQLite + FTS5). You click **Index library** to recursively scan your registered locations (defaults: Documents, Desktop, Downloads, plus any folders you add), then search by **file name** and **extracted text**.

## What it does

- One primary action: **Index library** — scans all indexed locations for supported files.
- **Full-text search** across indexed content with filters for location, file type, and parse status.
- **Document detail** view with path, metadata, parse status, and extracted text preview.

## What it does not do

No cloud sync, accounts, AI, link saving, note authoring, whole-disk crawling, or editing/deleting your files on disk.

## Supported file types

| Extension | Indexing |
|-----------|----------|
| `.txt` | Yes |
| `.pdf` | Yes (text extraction via pdf.js) |
| `.docx` | Yes (text extraction via mammoth) |

Other extensions are not discovered for indexing.

## Documentation index

| Doc | Topic |
|-----|--------|
| [`docs/API.md`](docs/API.md) | Tauri commands + TypeScript services, validation, examples |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Schema, indexes, migrations, duplicates, pruning, transactions |
| [`docs/ENV.md`](docs/ENV.md) | Environment variables (`VITE_E2E_SQLITE`, dev logging) |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Capabilities, path safety, SQL/FTS notes |
| [`docs/PRODUCTION.md`](docs/PRODUCTION.md) | Build, logging, health, packaging notes |
| [`docs/PROOF.md`](docs/PROOF.md) | Verification artifacts + architecture |
| [`docs/DEMO_CHECKLIST.md`](docs/DEMO_CHECKLIST.md) | Manual demo steps |
| [`docs/DEMO_VIDEO.md`](docs/DEMO_VIDEO.md) | How to record a short demo clip |

## Requirements

- Node.js 20+ (recommended)
- Rust toolchain (for `tauri dev` / `tauri build`)
- Windows / macOS / Linux (default roots use the `dirs` crate)

## Run

```bash
npm install
npm run dev
```

Web-only UI (no native shell; folder defaults / disk reads need Tauri or e2e shims):

```bash
npm run dev:web
```

## Test

```bash
npm run typecheck
npm run test
npm run test:e2e
```

In `src-tauri`:

```bash
cargo test
```

E2E uses `VITE_E2E_SQLITE=1` (see [`playwright.config.ts`](playwright.config.ts)) and `window.__STACKDROP_E2E__` shims for Tauri invokes.

## How indexing works

1. **Locations** are rows in `indexed_folders`. If none exist after startup migrations, the app calls `get_default_document_roots` and registers each returned path.
2. **Index library** runs `runAllFolderScans`: for each folder, Rust `discover_supported_files` walks the tree (no symlink follow), then the app reads bytes via `read_file_bytes_under_root` (path must stay under the root), parses in TypeScript, upserts `indexed_documents`, updates FTS5 `document_search`, and removes DB rows for files that disappeared since the last scan.
3. **Parse failures** are stored with `parse_status = failed` and are not added to FTS as successful body text.

## Tauri “API” (commands)

Typed invokes are wrapped in [`src/features/folders/services/tauriFolderFs.ts`](src/features/folders/services/tauriFolderFs.ts):

| Command | Purpose |
|---------|---------|
| `get_default_document_roots` | Canonical Documents / Desktop / Downloads |
| `open_folder_dialog` | Pick an extra folder |
| `discover_supported_files` | List supported files under one root |
| `read_file_bytes_under_root` | Read a file if under root |
| `app_health` | `{ ok, packageVersion }` shell diagnostic |

Example:

```typescript
import { invoke } from "@tauri-apps/api/core";

const health = await invoke<{ ok: boolean; packageVersion: string }>("app_health");
```

## Data model

See [`docs/DATABASE.md`](docs/DATABASE.md) (narrative) and [`src/data/db/schema.sql`](src/data/db/schema.sql) (DDL). Migrations: [`src/data/db/migrate.ts`](src/data/db/migrate.ts).

## Proof / demo

- [`docs/DEMO_CHECKLIST.md`](docs/DEMO_CHECKLIST.md) — manual verification steps.
- [`docs/PROOF.md`](docs/PROOF.md) — artifacts and architecture summary.
- [`docs/DEMO_VIDEO.md`](docs/DEMO_VIDEO.md) — optional screen recording guide.
- E2E writes screenshots under `docs/proof-screenshots/` when `npm run test:e2e` runs (see Playwright specs in `src/tests/e2e/`).

## License

See repository license (if any).
