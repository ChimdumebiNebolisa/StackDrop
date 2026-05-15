# StackDrop Architecture

> **Superseded** — This architecture draft assumed **notes, links, and `.md`** as first-class types. The **shipped codebase** follows the boundaries in [`PROOF.md`](PROOF.md) and [`API.md`](API.md) (Tauri commands + SQLite services). For high-level structure, prefer those docs and [`stackdrop-architecture.md`](stackdrop-architecture.md) if it matches your checkout.

Version: v1.0  
Status: Locked for initial build  
Date: 2026-05-12

## 1. Architecture goal

Define clear boundaries for a local-first desktop app that captures, stores, indexes, organizes, and retrieves personal resources without accounts or remote services.

This document constrains where code lives, which part owns which responsibility, and how parts are allowed to interact.

## 2. Major system parts

### 2.1 Desktop shell
**Ownership**
- Owns native window lifecycle.
- Owns native file dialog access.
- Owns the bridge between the TypeScript app and OS-level capabilities.

**Does not own**
- business rules
- search ranking rules
- item organization logic

### 2.2 UI application
**Ownership**
- Owns screens, routes, user interactions, and local presentation state.
- Owns loading, empty, success, and error states.
- Calls application services through explicit interfaces.

**Does not own**
- direct database writes
- parsing rules
- search index mutation rules

### 2.3 Application services
**Ownership**
- Own capture workflows.
- Own item update workflows.
- Own removal workflows.
- Own search orchestration.
- Own validation of application use cases before persistence.

**Does not own**
- UI rendering
- raw storage details
- OS dialogs

### 2.4 Parsing and ingestion
**Ownership**
- Converts supported source content into normalized text and metadata for storage and indexing.
- Applies format-specific parsing rules for `.txt`, `.md`, and `.pdf`.
- Returns explicit parse success or parse failure status.

**Does not own**
- search queries
- UI messages
- collection or tag assignment rules beyond what is passed in

### 2.5 Persistence and search store
**Ownership**
- Owns local data persistence.
- Owns item records, tags, collections, and indexed text.
- Owns search query execution.
- Owns transactional updates for item metadata and indexed text.

**Does not own**
- UI state
- OS integration
- parsing of raw files

## 3. Interfaces between parts

### UI -> application services
Allowed operations:
- createNote(input)
- saveLink(input)
- importFile(input)
- updateItemMetadata(input)
- assignCollection(input)
- removeCollectionAssignment(input)
- removeItem(input)
- searchItems(query)
- listItems(filters)
- getItemDetail(id)
- listCollections()
- listTags()

Rule:
- The UI must never bypass application services to write directly to storage.

### Application services -> parsing and ingestion
Allowed operations:
- parseFile(path, fileType)
- normalizeNote(noteInput)
- normalizeLink(linkInput)

Rule:
- Parsing returns structured success or structured failure.
- Parse failures must be explicit and must not be swallowed.

### Application services -> persistence and search store
Allowed operations:
- insertItem(record)
- updateItem(record)
- deleteItem(id)
- fetchItem(id)
- fetchItems(filters)
- searchIndex(query)
- upsertTags(itemId, tags)
- setCollection(itemId, collectionId)
- clearCollection(itemId)

Rule:
- Business rules stay in application services.
- Storage layer enforces data integrity, not feature policy.

### Desktop shell -> UI/application services
Allowed operations:
- open file picker
- resolve safe local file path access
- return file bytes or path for ingestion

Rule:
- Native shell code must stay small and focused on OS boundary work.

## 4. Core entities

### Item
Represents one stored resource.

Fields:
- id
- type: `note | link | file`
- title
- sourcePath nullable
- sourceUrl nullable
- previewText nullable
- isIndexed boolean
- parseStatus: `not_applicable | indexed | failed`
- createdAt
- updatedAt

### NoteContent
Fields:
- itemId
- body

### LinkMetadata
Fields:
- itemId
- url

### FileMetadata
Fields:
- itemId
- filePath
- fileExtension
- extractedText nullable

### Tag
Fields:
- id
- name

### ItemTag
Fields:
- itemId
- tagId

### Collection
Fields:
- id
- name

## 5. Data ownership rules

- `Item` is the source of truth for shared item metadata.
- `NoteContent`, `LinkMetadata`, and `FileMetadata` own type-specific content only.
- Searchable text is derived data and must be regenerated from the source-specific content path.
- Tag and collection assignment rules are owned by application services.
- The storage layer must not duplicate business rules that already exist in application services.

## 6. External dependencies

Only dependencies materially required for v1 are allowed.

### Desktop and UI
- Tauri
- TypeScript
- React
- Vite

### Storage
- SQLite
- SQLite FTS5 for full-text search

### Parsing
- Native text handling for `.txt` and `.md`
- PDF text extraction library in the TypeScript app layer

### Validation and testing
- Vitest for unit tests
- Playwright for UI verification where needed

## 7. Chosen stack after responsibilities are clear

### Chosen stack
- Desktop shell: Tauri
- UI: React + TypeScript
- Application logic: TypeScript
- Local database: SQLite
- Full-text search: SQLite FTS5
- Build tool: Vite
- Tests: Vitest and Playwright

### Why this stack was chosen
- It keeps the product desktop-first without adding accounts or server infrastructure.
- It keeps the implementation mostly in TypeScript.
- It uses a local database with built-in full-text search, which is simpler than adding a separate search engine.
- It minimizes moving parts for a single-user local-first app.

## 8. Rejected alternatives

### Tauri + Rust-heavy business logic
Rejected because it adds cross-language complexity too early for a v1 that does not need it.

### Electron + TypeScript
Rejected because the simpler packaging and lighter footprint of Tauri better fit a local-first single-user desktop app.

### Dedicated search engine instead of SQLite FTS5
Rejected because it adds unnecessary operational and code complexity for a local desktop v1.

### Cloud backend
Rejected because it conflicts with the PRD constraint of local-first with no accounts or remote dependency.

## 9. Folder and file structure

```text
stackdrop/
  src/
    app/
      routes/
      layout/
      providers/
    features/
      items/
        components/
        screens/
        hooks/
        services/
      search/
        components/
        hooks/
        services/
      notes/
        components/
        services/
      links/
        components/
        services/
      files/
        components/
        services/
      tags/
        components/
        services/
      collections/
        components/
        services/
    domain/
      items/
      search/
      tags/
      collections/
      ingestion/
    data/
      db/
      repositories/
      mappers/
      search/
    lib/
      validation/
      time/
      errors/
    tests/
      unit/
      integration/
      e2e/
  src-tauri/
    src/
      commands/
      main.rs
    tauri.conf.json
  docs/
    PRD.md
    ARCHITECTURE.md
    GUARDRAILS.md
    PLAN.md
```

## 10. File-level ownership notes

- `src/app/` owns routing, shell composition, and app wiring only.
- `src/features/` owns feature-specific UI and feature application service calls.
- `src/domain/` owns business rules and use-case logic.
- `src/data/` owns persistence, queries, FTS access, and mapping.
- `src/lib/` owns shared utilities with no business policy.
- `src-tauri/` owns OS boundary code only.

## 11. Boundary rules

- Do not add a backend service unless the Architecture is updated first.
- Do not move business rules into UI components.
- Do not place direct SQL inside UI code.
- Do not let Tauri shell code become an alternate application service layer.
- Do not add new cross-cutting layers unless the Architecture is updated first.

## 12. Known architecture assumptions

- One local SQLite database is sufficient for v1.
- Collection membership is one item to zero-or-one collection in v1.
- Tags are many-to-many.
- Full-text search over notes and successfully parsed files is sufficient for v1.
- Links are searchable by stored metadata and user-entered title, not by fetched webpage body.
