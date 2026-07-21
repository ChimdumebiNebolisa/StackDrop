# StackDrop PRD

Version: v2.1.4
Status: Active product definition
Date: 2026-07-10

## 1. Product definition

### What the app is

StackDrop v1 is a **local-first desktop document indexer and search app** for a **single user**. The user opens the app and triggers **one primary action** (“Index library” / “Scan documents”) to **recursively index** supported documents under **registered search roots**, then **searches by file name and extracted content** with filters that support the core use case.

**Registered roots** are stored in the app database. On first launch (or whenever **no roots** are configured), the app **seeds safe default roots** when they exist on disk:

- **Documents**
- **Desktop**
- **Downloads**

The user may **add additional folders** via the OS folder picker; they may **remove** any root from the app index (disk files are never deleted).

Indexed scope is **only** paths under these registered roots. StackDrop does **not** crawl the whole disk, system directories, or paths outside registered roots.

### What the app is not

StackDrop v1 is **not**:

- a note-taking app, link saver, or manual-import-first organizer
- an AI assistant, chatbot, cross-document synthesis tool, or semantic search product; its optional AI scope is one selected-document summary
- a cloud drive, sync product, or collaboration product
- a browser extension
- a system-wide “index everything” crawler
- a login, account, or auth product
- a file manager, editor, or tool that deletes or renames user files on disk

### Primary actor

A single desktop user who wants **fast local search** across **personal documents** in familiar locations, with **one clear indexing action**.

### Main job to be done

When I open StackDrop, I click **one button** to refresh my local document index from safe locations I control, then **find files** by **name or content**.

## 2. Scope and priority

### Must-have (v1)

#### One-click indexing

- **Primary action:** a single prominent control (e.g. “Index library”) that runs an **autonomous recursive scan** of **all registered roots** in sequence.
- **Default roots:** when the folder registry is **empty**, seed **Documents**, **Desktop**, and **Downloads** (each only if that directory exists and resolves to a canonical path).
- **Optional roots:** user can **add** folders via picker; **remove** a root from the app **without** deleting files on disk.
- **Recursive scan** under each root for supported files only.
- **Supported types (searchable):**
- **`.txt`**
- **`.pdf`**
- **`.docx`** (Office Open XML Word)
- **`.doc`** (legacy Word, extracted locally when the bundled tool is available)
- **Index fields:** file name, absolute path, path relative to root, extension, size, modified time, extracted text when parsing succeeds, **parse status** and error detail on failure.
- **Unsupported** extensions are never stored as successfully indexed searchable documents.

#### Search and browse

- **Search** by **file name** and **indexed body** (FTS).
- **Filters** limited to what materially helps discovery:
  - **indexed root** (folder)
  - **file type** (extension)
  - **parse status** (`parsed_text` | `parsed_ocr` | `parse_failed`)
- **Manual re-scan** via the primary index action (and optional per-root re-scan if retained in UI).
- **Document detail:** path, type, timestamps, parse status/error, extracted preview.

#### Status and transparency

- User-visible indexing lifecycle: **idle**, **scanning**, **completed**, **completed with errors** (e.g. any parse/read failures or partial failures aggregated across roots).
- **No** deletion of user files from disk by StackDrop.

#### Local-first

- Core flows work **without** any account or remote backend.
- All index data is stored **locally**.

#### Optional selected-document summaries

- The user may save their own OpenAI API key in Settings through native OS credential storage.
- An indexed document with extracted text exposes **Summarize**, followed by a separate deliberate **Generate summary** action.
- Only bounded prepared extracted text from that selected document plus filename, relative path, and extension may be sent.
- The returned structured summary is validated, shown in a side panel, and kept only in memory.
- The feature does not change discovery, parsing, indexing, SQLite, FTS search, diagnostics, or file watching.

### Should-have

- Per-root “Re-scan” for power users (secondary to the primary index action).

### Nice-to-have

- Keyboard shortcut to focus search.
- Duplicate-root warning when adding a nested or duplicate path.

## 3. Out of scope for v1 (forbidden without PRD update)

- AI chat, follow-up questions, cross-document synthesis, citations, embeddings, saved summary history, automatic/background AI requests, model/provider selectors, or content telemetry
- Cloud indexing, accounts, sync, or sharing
- Semantic/vector search unless a lexical benchmark proves a gap and the implementation stays fully local
- Always-on background full-disk scan
- Sync, accounts, sharing, mobile, browser extension
- REST/HTTP “health APIs” — use **Tauri commands** and in-app diagnostics instead

## 4. Acceptance criteria (v1)

- Default roots appear when starting from an **empty** registry (where OS folders exist).
- **Index library** runs scans for **all** registered roots recursively.
- **`.txt`**, **`.pdf`**, **`.docx`**, and **`.doc`** index and search correctly when parsing succeeds; failures are explicit `parse_failed` with detail.
- Search matches **file name** and **body**; filters work for folder, extension, parse status.
- Re-scan updates the index; **removed files** disappear from results after scan.
- Removing a root from the app does not delete disk files.
- No login, cloud indexing, or implicit/background AI in product paths. Indexing and search work without the optional summary feature.
- Summary credentials use native OS credential storage, and automated tests never access real credentials or OpenAI.
- Summary generation transmits only the documented prepared selected-document data after explicit consent and never persists the result.

## 5. Constraints

- Desktop (Tauri) only, single user.
- Local-only index at rest.
- Minimum necessary Tauri filesystem permissions; path containment enforced in the shell layer.
- Optional summary networking uses a fixed native HTTPS boundary and does not expand Tauri capabilities.

## 6. Success conditions for v1

- Every **must-have** is implemented with **verification artifacts** (tests and/or documented checks).
- **README** explains purpose, run, test, indexing behavior, supported types, and **known limitations** (e.g. scanned PDFs without a text layer).
- Proof pack: demo checklist + screenshots of core flows where feasible.
