# StackDrop

StackDrop is a local-first Windows desktop app for searching documents on your computer by filename, path, and extracted content.

It is for people who want fast local document search without uploading files, creating an account, or syncing data to a cloud service.

## Install on Windows

1. Open the [latest GitHub Release](https://github.com/ChimdumebiNebolisa/StackDrop/releases/latest).
2. Download the Windows installer named like `StackDrop_*_x64-setup.exe`.
3. Run the installer. The app is unsigned, so Windows may show a SmartScreen warning.
4. Open StackDrop.
5. Add a folder, or use the default document folders.
6. Click **Index library**.
7. Search by filename, folder path, or document content.

MSI packages may also be attached to releases for managed install workflows, but the `.exe` installer is the normal user download.

## What StackDrop Does

- Indexes local folders such as Documents, Desktop, Downloads, and folders you add.
- Searches supported documents by filename, relative path, and extracted text.
- Ranks filename matches above path matches, and path matches above body matches.
- Shows snippets for content matches when available.
- Watches indexed folders while the app is open and can re-index changed files.
- Skips unchanged healthy files on repeat scans, avoiding unnecessary file reads, parsing, OCR, and search-index rewrites.
- Shows index diagnostics, read/parser failures, scan progress, and partial scan status.
- Keeps indexed data on this computer.

StackDrop does not require an account, does not upload files, and does not delete, rename, or move your documents.

## Supported Files

StackDrop indexes these file types:

- `.txt`
- `.pdf`
- `.docx`
- `.doc`

PDF text is extracted locally. Scanned PDFs may use bundled local OCR and can take longer. DOCX parsing uses local document text extraction. Legacy `.doc` files use a bundled local extraction tool when available.

Unsupported file types are skipped during discovery.

## Indexing and Diagnostics

The index controls show live progress while a scan is active, including the current folder or file, scan phase, discovered/indexed/failed counts, and elapsed time.

Diagnostics explain:

- whether each indexed folder is healthy, not yet scanned, partially scanned, or has a root issue
- how many documents are searchable
- read failures, when a file could not be read
- parser failures, when content could not be extracted
- partial scans, when StackDrop pauses a large root after the timeout to keep the app responsive

Failed parses do not break filename or path search. Those files can still be found by name/path, but their content may not be searchable.

Repeat scans still discover supported files and compare local metadata, but files that are already successfully indexed and have the same path, size, and modified timestamp are not read or parsed again.

If a scan pauses before all discovered files are processed, click **Re-scan this folder** or **Index library** to retry indexing. Re-scans prioritize files that were not indexed yet, but StackDrop does not currently store an exact resume cursor.

## Known Limitations

- Windows installers are currently unsigned.
- Very large roots can take time to scan.
- Partial scans preserve completed work but are retried on a later scan rather than resumed from an exact saved cursor.
- Unsupported file types are skipped and are not counted in diagnostics.
- Some PDFs, damaged documents, encrypted files, cloud placeholders, or permission-blocked files may fail read or parse.

## Developer Setup

Install dependencies:

```bash
npm ci
```

Run the web UI shell:

```bash
npm run dev:web
```

Run the full Tauri desktop app:

```bash
npm run dev
```

For web-only E2E/dev flows, set `VITE_E2E_SQLITE=1` so the browser shell uses the sql.js fallback instead of native Tauri plugins.

## Verification

```bash
npm run typecheck
npm run test
npm run test:e2e
npm run build
cd src-tauri
cargo test
cd ..
git diff --check
```

## Build Installers Locally

```bash
npm run tauri -- build
```

Installer outputs are generated under:

```text
src-tauri/target/release/bundle/nsis/
src-tauri/target/release/bundle/msi/
```

Generated `target/` output and installers are local build artifacts and are not committed to GitHub.

## Release Workflow

GitHub Releases are the distribution path for normal users. A version tag such as `v2.1.4` builds Windows installers in GitHub Actions and attaches the NSIS `.exe` and MSI `.msi` artifacts to the release.

See [docs/RELEASE.md](docs/RELEASE.md) for the release checklist.
