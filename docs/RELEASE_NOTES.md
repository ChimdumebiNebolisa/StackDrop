# StackDrop v2.1.5 Release Notes

## Highlights

- Added optional one-click summaries for the currently selected indexed document.
- Added BYOK setup in Settings. On Windows, StackDrop stores the OpenAI API key in Windows Credential Manager and never returns the stored key to the React frontend.
- Added a native OpenAI Responses API boundary using `gpt-5.6-sol`, `store: false`, no tools, bounded input and output, strict Structured Outputs, and safe typed errors.
- Added deterministic beginning/middle/end sampling for documents whose prepared text exceeds 48,000 Unicode code points, with a visible truncation notice.
- Added an accessible summary drawer with explicit generation, loading, retry, missing-key, invalid-key, and structured result states. Summaries remain in memory only.
- Added continuous integration for web, component, Playwright, Rust, release-integrity, and packaging prerequisites on pull requests and `main`.

## Privacy Boundary

StackDrop discovery, parsing, SQLite indexing, FTS search, diagnostics, and file watching remain local. A network request occurs only after the user opens one document, selects **Summarize**, and then selects **Generate summary**. The request contains only the prepared extracted text plus the filename, relative path, and extension. Absolute paths, folder roots, other documents, diagnostics, database contents, parse errors, and the API key are not included in the model input.

## Test Coverage

- Unit coverage for whitespace normalization, paragraph preservation, Unicode, exact and oversized limits, deterministic three-section sampling, omission markers, truncation metadata, malformed summaries, unknown fields, and size bounds.
- React coverage for credential save/replace/remove, disabled summary states, missing credentials, loading, success, optional sections, invalid keys, retry, close/focus behavior, and truncation disclosure.
- Rust coverage for credential identifiers, safe errors, request construction, selected model, `store: false`, absent tools, injection-resistant data boundaries, status mapping, response extraction, and schema validation.
- Playwright coverage for the complete mocked Settings-to-summary success flow and an actionable invalid-key flow. Automated tests never call OpenAI or use real credentials.

## Distribution

The `v2.1.5` GitHub release includes both Windows installer formats:

- NSIS `.exe` installer
- Windows Installer `.msi` package

## Known Limitations

- Summaries are not saved and disappear when the drawer closes or the app exits.
- Only one selected document can be summarized per explicit request; there is no chat, history, citations, cross-document synthesis, or background generation.
- Long documents use deterministic character sampling rather than token counting.
- API usage and charges belong to the user's OpenAI account, and model/account access requirements still apply.
- Windows may retain the Credential Manager entry after uninstall; use **Remove key** in Settings before uninstalling when credential removal is desired.
- Windows installers remain unsigned, so SmartScreen may warn users.

Primary Codex `/feedback` session ID: `019f8607-9df0-7472-b611-d73b6d49455a`
