# StackDrop

StackDrop is a desktop-first document indexing app built with Tauri + React. It scans local folders, extracts text from supported files, and gives you one searchable library with filters and detail views. Everything stays local (SQLite + FTS5).

## What problem it solves

Files are often spread across Documents, Desktop, Downloads, and custom folders. StackDrop gives you a single place to:

- index supported files from selected folders
- search by filename or extracted content
- inspect parse status and text preview per document

## Key features

- **Index library:** one action to scan all registered locations.
- **Add/re-scan/remove locations:** manage what is indexed.
- **Full-text search + filters:** location, file type, parse status.
- **Document details:** absolute path, metadata, parse result, extracted preview.
- **Local-only architecture:** no cloud account, no remote API, no auth backend.

## Supported file types

| Extension | Support |
|---|---|
| `.txt` | Full support |
| `.pdf` | Text-layer extraction (`pdf.js`) |
| `.docx` | Text extraction (`mammoth`) |

## Screenshots / proof

Desktop-only app (no hosted web demo). Current proof screenshots:

- [`docs/proof-screenshots/01-library-after-index.png`](docs/proof-screenshots/01-library-after-index.png)
- [`docs/proof-screenshots/02-search-by-title.png`](docs/proof-screenshots/02-search-by-title.png)
- [`docs/proof-screenshots/03-search-by-content.png`](docs/proof-screenshots/03-search-by-content.png)
- [`docs/proof-screenshots/04-document-detail.png`](docs/proof-screenshots/04-document-detail.png)

## Requirements

- Node.js 20+
- Rust stable toolchain
- OS: Windows, macOS, or Linux

## Setup

```bash
git clone https://github.com/ChimdumebiNebolisa/StackDrop.git
cd StackDrop
npm install
```

No `.env` file is required for normal desktop use.

## Run

```bash
# Full desktop app (Tauri + web UI)
npm run dev

# Web UI only (no native file access)
npm run dev:web
```

## Test

```bash
npm run typecheck
npm run test
npm run test:e2e
```

Rust tests:

```bash
cd src-tauri
cargo test
```

## Build

Web assets:

```bash
npm run build
```

Desktop bundles:

```bash
npm run tauri -- build
```

## Windows installer/exe artifacts

When you build on Windows x64, output files are generated under `src-tauri/target/release/`:

- `bundle/nsis/StackDrop_<version>_x64-setup.exe` (recommended installer)
- `bundle/msi/StackDrop_<version>_x64_en-US.msi`
- `stackdrop.exe` (unsigned raw binary)

Current project version: `2.0.0`.

## Known limitations

- Scanned PDFs without a text layer may fail to index or return empty text (no OCR yet).
- StackDrop does not watch files continuously; run **Index library** or **Re-scan** to refresh.
- Legacy `.doc` is not supported. Supported formats are `.txt`, `.pdf`, `.docx`.
- Default roots are only added when standard OS profile folders exist.

## Next improvements (planned direction)

- OCR support for scanned PDFs.
- Optional background file watching.
- Better parse diagnostics and recovery hints per document.

## Notes

- This repo is a desktop app, not a cloud SaaS product.
- There is no auth service, no server API, and no AI pipeline in scope.

## License

MIT — see [LICENSE](LICENSE).
