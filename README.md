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

### Summary feature test coverage

The summary feature is covered at each trust boundary without putting a real key or real OpenAI request into automated tests:

- `prepareDocumentText.test.ts` covers blank input, whitespace and paragraph normalization, Unicode, exact and oversized limits, deterministic beginning/middle/end sampling, omission markers, and truncation metadata.
- `validateDocumentSummary.test.ts` covers the valid schema, empty optional arrays, missing fields, incorrect types, oversized arrays and strings, malformed JSON, and unexpected properties.
- `OpenAIKeySettings.test.tsx` covers configured and missing-key states plus save, replace, and remove interactions without ever reading a stored key back into React.
- `DocumentSummaryLauncher.test.tsx` covers disabled documents, missing credentials, deliberate generation, loading, structured rendering, optional-section hiding, invalid-key guidance, retry, close/focus behavior, and truncation disclosure.
- Rust tests cover the fixed GPT-5.6 model and request settings, absence of tools, prompt/data separation, document-ID exclusion, input bounds, safe status mapping, refusal handling, schema enforcement, stable credential identifiers, and secret-free error serialization.
- `web-shell.spec.ts` exercises the complete Settings → document → **Summarize** → **Generate summary** → structured panel path plus invalid-key recovery through `window.__STACKDROP_E2E__` mocks.

The Playwright boundary is intentionally in-memory. CI and release builds never use Windows Credential Manager credentials and never call the real OpenAI API.

### CI/CD integration

`.github/workflows/ci.yml` runs on every pull request and push to `main`. The Linux job installs a pinned npm dependency graph and Playwright Chromium, then validates file capabilities, TypeScript, Vitest unit/integration coverage, web-shell E2E behavior, and the production frontend build. The Windows job checks Rust formatting, runs native Rust tests with the bundled-tool path configured, and validates release metadata and required Windows resources.

`.github/workflows/release.yml` is the deployment path. A semantic version tag runs the same file-capability, type, Vitest, Playwright, frontend-build, Rust-format, Rust-test, and release-integrity gates on Windows before Tauri packages the app. The workflow uploads the NSIS `.exe` and MSI `.msi` as build artifacts, then publishes both files on the matching GitHub Release. Any failed check or missing installer stops publication.

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

### What existed before Build Week

StackDrop already provided local folder discovery, local parsing for `.txt`, `.pdf`, `.docx`, and `.doc` files, SQLite indexing, FTS search, diagnostics, scan progress, and file watching. The Build Week work did not replace those systems or add AI to indexing or search. The new work is an optional, explicitly initiated extension for one selected document.

### How Codex was used

Codex was used as the development agent for the feature from repository audit through implementation and verification. The developer supplied the product requirements, privacy boundaries, and approval decisions; Codex inspected the existing architecture, proposed the scoped change, challenged the plan for security and packaging risks, edited the code and documentation, ran the test/build commands, and organized the work into reviewable Git commits.

The Codex-assisted workflow included:

1. **Repository audit and scope control.** Codex inspected the React routes and providers, the existing `#settings` section, document-detail data flow, Tauri commands, Rust dependencies, test conventions, Windows capabilities, E2E mocks, and release workflow. That audit confirmed that summaries could use the existing extracted text without changing discovery, parsers, SQLite, FTS, file watching, supported formats, or database tables.
2. **Plan and red-team pass before editing.** The implementation plan was reviewed for API-key exposure, plaintext persistence, frontend bundle leakage, secret logging, absolute-path transmission, document prompt injection, malformed model output, oversized documents, duplicate requests, missing credentials, Playwright isolation, Windows installer compatibility, and accidental refactors. The resulting design moved secrets and networking into Rust, bounded the input, added two validation layers, and kept automated tests off the real API.
3. **Native trust boundary.** Codex implemented Windows Credential Manager storage in `src-tauri/src/services/credential_store.rs`, typed Tauri commands in `src-tauri/src/commands/summary_commands.rs`, and the HTTPS Responses API client in `src-tauri/src/services/openai_summary.rs`. React can submit a replacement key but cannot retrieve the saved key. Native errors are reduced to fixed codes so keys, authorization headers, raw provider responses, and request objects are not exposed to the UI.
4. **Focused product UI.** Codex extracted the BYOK settings into `src/features/settings/`, added the summary feature under `src/features/document-summary/`, and kept `DocumentDetailScreen` as a narrow integration point. The drawer requires a second, deliberate **Generate summary** action, manages focus and Escape behavior, presents actionable error states, and keeps the result only in memory.
5. **Deterministic data preparation and validation.** Codex added a pure 48,000-character preparation function that preserves useful paragraph structure and samples the beginning, middle, and end of oversized documents. It also added strict Rust and TypeScript validation for the same summary contract instead of rendering arbitrary model text or raw JSON.
6. **Verification and delivery discipline.** Codex added unit, Rust, React component, and Playwright coverage; used in-memory E2E mocks rather than real credentials or network calls; ran the existing type, test, build, formatting, release-integrity, and installer-build paths; inspected the final diff for secrets and scope drift; and split the feature into native-boundary, UI/test, and documentation commits. Human review and a valid developer-owned API key are still required for live-account verification and release approval.

This use of Codex was intentionally constrained: it did not redesign StackDrop, broaden the supported file formats, add cloud accounts, or alter local search behavior. It worked from the repository's `AGENTS.md` rules and the Build Week brief, and it preserved unrelated pre-existing worktree changes rather than staging them with the feature.

### How GPT-5.6 is used in StackDrop

The shipped summary path uses the OpenAI Responses API with the explicit flagship model identifier [`gpt-5.6-sol`](https://developers.openai.com/api/docs/guides/model-guidance?model=gpt-5.6). OpenAI's current model guidance identifies Sol as the flagship GPT-5.6 tier and recommends the Responses API for reasoning workflows. StackDrop uses low reasoning effort because this is a bounded, latency-sensitive summarization task rather than an open-ended agent workflow.

GPT-5.6 is called only after the user opens one parsed document, chooses **Summarize**, reviews the disclosure, and chooses **Generate summary**. The native request has these boundaries:

- `model: "gpt-5.6-sol"`, `reasoning.effort: "low"`, `store: false`, `stream: false`, and `max_output_tokens: 1800`
- no tools, web search, file search, streaming, background generation, or multi-agent behavior
- only the prepared extracted text plus `fileName`, `relativePath`, and `fileExtension`
- no absolute path, folder root, document ID, source file, database data, diagnostics, parse errors, unrelated documents, or API key in the model input
- developer instructions that label all document content and metadata as untrusted data, tell the model to ignore instructions inside the document, restrict it to the supplied document, and prohibit invented facts

The request uses strict [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) for this contract:

```json
{
  "overview": "string",
  "keyPoints": ["string"],
  "importantDetails": ["string"],
  "importantDates": ["string"],
  "actionItems": ["string"],
  "uncertainties": ["string"]
}
```

The schema rejects extra properties and caps array and string sizes. Rust validates the provider response before it crosses the Tauri boundary, and TypeScript validates it again before rendering. Refusals, incomplete output, malformed JSON, excessive values, invalid credentials, rate limits, timeouts, network failures, and unavailable-model responses become safe, typed UI errors rather than raw response dumps.

GPT-5.6 does **not** discover files, parse documents, create the SQLite index, rank search results, watch folders, or run automatically. It produces one ephemeral structured summary for the selected document. StackDrop does not save that summary, create history, build embeddings, perform retrieval, combine documents, or offer chat or follow-up questions.

### Build Week extension summary

The new extension consists of secure BYOK settings, a native OpenAI request boundary, explicit selected-document summaries, a validated structured summary drawer, privacy disclosure, deterministic long-document sampling, and scoped automated coverage. The deliberately excluded work includes chat, cross-document synthesis, citations, embeddings, vector search, saved summaries, summary history, automatic summarization, and background AI requests.

Primary Codex `/feedback` session ID: `019f8607-9df0-7472-b611-d73b6d49455a`

## Release Workflow

GitHub Releases are the distribution path for normal users. A version tag such as `v2.1.4` builds Windows installers in GitHub Actions and attaches the NSIS `.exe` and MSI `.msi` artifacts to the release.

See [docs/RELEASE.md](docs/RELEASE.md) for the release checklist.
