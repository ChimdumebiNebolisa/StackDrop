# StackDrop PRD

Version: v1.3 (core document types)
Status: Locked for v1 build
Date: 2026-05-12

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
- an AI assistant, chatbot, or semantic search product
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
- **Index fields:** file name, absolute path, path relative to root, extension, size, modified time, extracted text when parsing succeeds, **parse status** and error detail on failure.
- **Unsupported** extensions are never stored as successfully indexed searchable documents.

#### Search and browse

- **Search** by **file name** and **indexed body** (FTS).
- **Filters** limited to what materially helps discovery:
  - **indexed root** (folder)
  - **file type** (extension)
  - **parse status** (`indexed` | `failed`)
- **Manual re-scan** via the primary index action (and optional per-root re-scan if retained in UI).
- **Document detail:** path, type, timestamps, parse status/error, extracted preview.

#### Status and transparency

- User-visible indexing lifecycle: **idle**, **scanning**, **completed**, **completed with errors** (e.g. any parse/read failures or partial failures aggregated across roots).
- **No** deletion of user files from disk by StackDrop.

#### Local-first

- Core flows work **without** any account or remote backend.
- All index data is stored **locally**.

### Should-have

- Per-root “Re-scan” for power users (secondary to the primary index action).

### Nice-to-have

- Keyboard shortcut to focus search.
- Duplicate-root warning when adding a nested or duplicate path.

## 3. Out of scope for v1 (forbidden without PRD update)

- AI features, vector search, OCR for scanned PDFs (unless PRD amended)
- Continuous directory watcher / always-on background full-disk scan
- Sync, accounts, sharing, mobile, browser extension
- REST/HTTP “health APIs” — use **Tauri commands** and in-app diagnostics instead

## 4. Acceptance criteria (v1)

- Default roots appear when starting from an **empty** registry (where OS folders exist).
- **Index library** runs scans for **all** registered roots recursively.
- **`.txt`**, **`.pdf`**, **`.docx`** index and search correctly when parsing succeeds; failures are explicit `failed` with detail.
- Search matches **file name** and **body**; filters work for folder, extension, parse status.
- Re-scan updates the index; **removed files** disappear from results after scan.
- Removing a root from the app does not delete disk files.
- No login, no cloud, no AI in product paths.

## 5. Constraints

- Desktop (Tauri) only, single user.
- Local-only index at rest.
- Minimum necessary Tauri filesystem permissions; path containment enforced in the shell layer.

## 6. Success conditions for v1

- Every **must-have** is implemented with **verification artifacts** (tests and/or documented checks).
- **README** explains purpose, run, test, indexing behavior, supported types, and **known limitations** (e.g. scanned PDFs without a text layer).
- Proof pack: demo checklist + screenshots of core flows where feasible.
