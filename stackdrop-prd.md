# StackDrop PRD

Version: v1.1 (folder indexing)  
Status: Locked for v1 build  
Date: 2026-05-12

## 1. Product definition

### What the app is

StackDrop v1 is a **local-first desktop document indexer and search app** for a **single user**. The user **explicitly selects one or more folders** on their machine; StackDrop **recursively discovers** supported documents under those roots, **extracts searchable text** where parsing succeeds, and **stores an index locally** so the user can **search by file name and content** and **browse/filter** results.

Indexed scope is **only user-selected folders**. StackDrop does **not** index the whole disk or arbitrary paths outside registered folders.

### What the app is not

StackDrop v1 is **not**:

- a note-taking-first app or general-purpose notes product
- a link saver or bookmark manager
- a manual “capture everything” resource organizer (no first-class note/link/file import as the primary workflow)
- an AI assistant, chatbot, or semantic search product
- a cloud drive, sync product, or collaboration product
- a browser extension
- an “index my whole computer automatically” product
- a login, account, or auth product
- a tool that deletes or renames user files on disk

**Notes and links** are **out of scope for v1** except where explicitly required for **one-time migration of legacy data** from StackDrop v0 (manual-import app). Unless a separate migration deliverable is approved, v1 does **not** ship note/link authoring or link storage as core product pillars.

### Primary actor

A single desktop user who wants **fast local search** across **documents in specific project or archive folders** they choose.

### Secondary actor

None.

### Main job to be done

When I point StackDrop at the folders that hold my documents, **find files quickly** by **name or content** without manually importing each file.

## 2. Scope and priority

### Must-have (v1)

#### Folder indexing

- User can **add** one or more folders to StackDrop (folder picker).
- User can **remove** a registered folder from StackDrop **without deleting** any files on disk (removes only app index state for that root and its documents).
- App **recursively scans** each registered folder for supported files.
- Supported file types for v1: **`.txt`**, **`.md`**, **`.pdf`** (case-insensitive extension matching; stored normalized as lowercase).
- App **extracts searchable text** for supported files **when parsing succeeds**.
- App **indexes** at minimum:
  - file name
  - absolute file path (for display and integrity)
  - path relative to the registered folder root (for stable grouping)
  - file type / extension
  - file size and modified time from the filesystem when discovered
  - extracted text content when available
  - explicit **parse status** and non-empty error detail when parse fails
- **Unsupported** files (other extensions) are **not** indexed as searchable documents. Discovery may **count** skipped non-supported files for transparency; they must **not** appear as fully indexed searchable documents.

#### Search and browse

- **Search** by **file name** and **indexed content** (full-text).
- **Browse/filter** by:
  - indexed folder (root)
  - file type (extension)
  - parse status (`indexed` | `failed`; `unsupported` only if explicitly surfaced as a row per indexing rules above)
- **Manual re-scan** of a selected registered folder on user action (no background watcher in v1 unless this PRD is amended).
- **Document detail** view: path, metadata (size, modified time, extension, folder), parse status/error, and **extracted text preview** (or clear empty state when none).

#### Local-first behavior

- Core flows work **without** any account.
- Core flows work **without** any remote server or cloud backend.
- All index data is stored **locally** on the device.

### Should-have (post must-have)

- Empty-state guidance for first-time “add a folder”.
- Duplicate-path warning when adding a folder that is already registered or nested in an existing root (exact UX TBD in implementation; behavior must be explicit, not silent).

### Nice-to-have

- Export index summary (counts only).
- Keyboard shortcut to focus search.

## 3. Out of scope for v1 (forbidden without PRD update)

- AI features of any kind
- Semantic / vector search
- OCR and scanned-PDF text unless added by PRD
- **Background directory watcher** (continuous auto re-index)
- Full-disk or “all user profile” implicit indexing
- Sync across devices
- Accounts, login, or auth
- Sharing or collaboration
- Browser extension
- Mobile app
- Deleting, moving, or editing user files on disk from within StackDrop

## 4. Acceptance criteria (v1)

The build meets this PRD only if all must-haves below are verifiable.

### Folder indexing

- User can register a folder and see it listed as an indexed root.
- Recursive scan finds nested **`.txt`**, **`.md`**, and **`.pdf`** files under that root.
- After scan, those files appear as indexed documents with correct folder association.
- Parse failure for a supported file yields **explicit** `failed` status (and detail), **no crash**, and **no false “indexed”** claim in UI.
- Removing a folder from StackDrop removes its documents from the app index **only**; files remain on disk.

### Search and browse

- Search matches **file name**.
- Search matches **extracted body text** for successfully parsed files.
- Filters correctly restrict by **folder**, **file type**, and **parse status** as implemented.
- Manual re-scan updates index state according to design (e.g. new/changed files reflected; removed files dropped from index).

### Detail

- Detail view shows path, metadata, parse status, and preview consistent with stored data.

### Local-first

- App runs core flows with **no login** and **no remote backend**.

## 5. Constraints

- Desktop (Tauri) only, single user.
- Local-only data at rest for the index.
- No AI, no auth, no sync, no cloud services in v1.
- Only must-have items belong in the initial implementation plan derived from this PRD.

## 6. Success conditions for v1

StackDrop v1 is done only when:

- every **must-have** in §2 is implemented,
- each must-have flow has a **verification artifact** (test, scripted check, or documented manual check),
- no **out-of-scope** capability ships without a PRD update,
- the shipped app still matches this PRD.
