# StackDrop

StackDrop is a local-first Windows desktop app for searching documents on your computer by filename, path, and extracted content. It can also generate an optional summary of one selected document using your own OpenAI API key.

It is for people who want fast local document search without creating an account or syncing their library to a cloud service. Indexing and search remain local; document text leaves the computer only after an explicit summary request.

## Install on Windows

1. Open the [latest GitHub Release](https://github.com/ChimdumebiNebolisa/StackDrop/releases/latest).
2. Download the Windows installer named like `StackDrop_*_x64-setup.exe`.
3. Run the installer. The app is unsigned, so Windows may show a SmartScreen warning.
4. Open StackDrop.
5. Add a folder, or use the default document folders.
6. Click **Index library**.
7. Search by filename, folder path, or document content.
8. Optional: open **Settings** and save your OpenAI API key to enable document summaries.

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
- Generates an optional structured summary for one open document after a deliberate **Generate summary** action.

StackDrop does not require an account and does not delete, rename, or move your documents. It never uploads files themselves. The optional summary feature sends only the bounded prepared text and limited metadata described below.

## Supported Files

StackDrop indexes these file types:

- `.txt`
- `.pdf`
- `.docx`
- `.doc`

PDF text is extracted locally. Scanned PDFs may use bundled local OCR and can take longer. DOCX parsing uses local document text extraction. Legacy `.doc` files use a bundled local extraction tool when available.

Unsupported file types are skipped during discovery.

## Document Summaries

Document summaries are optional and use your own OpenAI API key:

1. Open **Settings** and enter the key under **Document summaries**.
2. Open an indexed document with extracted text and choose **Summarize**.
3. Review the disclosure, then choose **Generate summary** to make one request.

On Windows, StackDrop stores the key in Windows Credential Manager under service `com.stackdrop.app` and account `openai-api-key`. The saved key is retrieved only by native Rust code, is never returned to React, and is not written to SQLite, browser storage, a configuration file, or an environment variable. Non-Windows development builds use memory-only session storage and report that limitation in Settings.

Indexing, parsing, SQLite data, FTS search, diagnostics, folder paths, and unrelated documents stay local. A summary request sends only the selected document's prepared extracted text plus its filename, relative path, and extension to the OpenAI Responses API. StackDrop never sends the absolute path, folder root, parse errors, diagnostics, database contents, the source file, or the API key as model input. OpenAI API usage and any resulting cost are charged to the OpenAI account associated with the user's key.

Prepared text is normalized and limited to 48,000 Unicode characters. Longer documents use deterministic bounded samples from the beginning, middle, and end; the summary panel discloses when this happens. Summaries use GPT-5.6 (`gpt-5.6-sol`) with storage disabled for the API response, are not generated automatically, and are not saved by StackDrop.

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
- Summaries require an eligible OpenAI project, network access, and available API quota; quality is limited by extracted text and the bounded sample for long documents.
- Summary requests are not currently cancellable once sent. The panel remains open until the request finishes.
- StackDrop does not retain summary history. Closing the panel or app discards the generated summary.
- Windows may retain the Credential Manager entry after uninstall; use **Remove key** in Settings before uninstalling if it should be deleted.

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

For web-only E2E/dev flows, set `VITE_E2E_SQLITE=1` so the browser shell uses the sql.js fallback and in-memory summary mocks instead of native Tauri plugins. Automated tests never access Windows Credential Manager or the real OpenAI API.

## Verification

```bash
npm run check:file-capabilities
npm run typecheck
npm run test
npm run test:e2e
npm run build
cd src-tauri
cargo fmt --check
cargo test
cd ..
git diff --check
powershell -ExecutionPolicy Bypass -File scripts/check-release-integrity.ps1
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

For a Windows release check, run the full verification suite above, then build both installer formats with `npm run tauri -- build`. Install the NSIS package for the normal user path and use the MSI for managed-install verification.

## OpenAI Build Week

Pre-existing StackDrop functionality includes local folder discovery, document parsing, SQLite indexing, FTS search, diagnostics, the file watcher, and support for `.txt`, `.pdf`, `.docx`, and `.doc` files.

The new GPT-5.6 extension adds secure BYOK settings, a native OpenAI request boundary, explicit one-click summaries for the selected document, a validated structured summary panel, clear privacy disclosure, and scoped unit, Rust, component, and Playwright coverage. It does not add chat, cross-document synthesis, embeddings, vector search, saved summaries, or background AI requests.

Primary Codex `/feedback` session ID: `TODO: add submission session ID`

## Release Workflow

GitHub Releases are the distribution path for normal users. A version tag such as `v2.1.4` builds Windows installers in GitHub Actions and attaches the NSIS `.exe` and MSI `.msi` artifacts to the release.

See [docs/RELEASE.md](docs/RELEASE.md) for the release checklist.
