# StackDrop PRD

Version: v1.0  
Status: Locked for initial build  
Date: 2026-05-12

## 1. Product definition

### What the app is
StackDrop is a local-first desktop app for a single user to capture, organize, browse, and search personal resources from one place.

A resource is one of:
- a local file
- a saved link
- a plain text note

The app helps the user stop losing useful material across folders, tabs, and scattered notes.

### What the app is not
StackDrop is not:
- an AI assistant
- a chatbot
- a cloud sync product
- a collaboration product
- a browser extension first
- a task manager
- a calendar
- a social product
- a login or account product
- a file deletion or file management tool

### Primary actor
A single desktop user who saves too many files, links, and notes and wants one place to find them later.

### Secondary actor
None in v1.

### Main job to be done
When I save useful stuff across files, links, and notes, help me capture it and find it again quickly without digging through folders or tabs.

## 2. Scope and priority

### Must-have
These are the only capabilities allowed into the initial build plan.

#### Capture
- Add a local file to the app index.
- Add a link by pasting a URL.
- Create a plain text note inside the app.

#### Stored metadata
Each item must store:
- stable internal id
- item type
- title
- original source path for files or URL for links
- created/imported timestamp
- updated timestamp
- zero or more tags
- zero or one collection

#### Search and browse
- Full-text search across indexed content for supported item types.
- Filter results by item type.
- Filter results by tag.
- Sort results by relevance or most recent.
- Browse all items.
- Browse a single item detail view.
- Browse items inside a collection.
- Browse items by tag.

#### Content view
- Show full note content.
- Show stored URL and metadata for links.
- Show extracted text preview for supported text-based files.

#### Organization
- Edit item title.
- Add and remove tags.
- Assign an item to a collection.
- Remove an item from a collection.

#### Removal
- Remove an item from the app index without deleting the original file from disk.

#### Local-first behavior
- The core flow must work without any account.
- The core flow must work without any remote server.
- All app data must be stored locally on the user device.

### Should-have
These may be considered after all must-have items are verified.
- Duplicate title warning during capture.
- Empty-state guidance for first-time use.
- Keyboard shortcut for creating a note.
- Basic import error history visible in the UI.

### Nice-to-have
These are explicitly lower priority than all must-have and should-have items.
- Drag-and-drop file import.
- Pin or favorite items.
- Recently viewed items section.
- Batch tagging.

## 3. Supported content in v1

### Supported item types
- Note
- Link
- File

### Supported file formats in v1
- `.txt`
- `.md`
- `.pdf`

### Explicit v1 rules for supported content
- Notes are fully editable in the app.
- Links are stored as URLs plus app-managed metadata.
- Files are indexed by extracted text when extraction succeeds.
- If a supported file cannot be parsed, the item may still be stored, but it must be marked as not indexed and must not appear in full-text matches.

## 4. Out of scope for v1

The following are forbidden in v1 unless the PRD is updated first:
- AI features of any kind
- semantic search
- recommendations
- OCR
- screenshot text extraction
- sync across devices
- accounts, login, or auth
- sharing or collaboration
- reminders
- task extraction
- browser extension
- folder auto-watch
- mobile app
- cloud backup
- nested collections
- multiple workspaces
- file editing for imported files
- deletion of the original source file from disk

## 5. Acceptance criteria

The build meets the PRD only if all must-have behaviors below are true.

### Capture acceptance
- The user can create a note, save it, and see it in the item list.
- The user can paste a URL, save it as a link item, and see it in the item list.
- The user can choose a supported local file, import it, and see it in the item list.

### Search acceptance
- A query matching note text returns the note.
- A query matching extracted file text returns the file when parsing succeeded.
- A query filtered by tag returns only items with that tag.
- A query filtered by type returns only items of that type.
- Relevance sort and recent sort both produce visibly different result ordering for an appropriate sample set.

### Browse acceptance
- The user can open an item detail view from the list.
- The user can open a collection view and see only items in that collection.
- The user can open a tag view and see only items with that tag.

### Organization acceptance
- The user can rename an item title and see the change reflected in list and detail views.
- The user can add and remove tags from an item.
- The user can assign and unassign a collection.

### Removal acceptance
- The user can remove an item from the app index.
- Removing an item from the app index does not delete the original file from disk.

### Local-first acceptance
- The app can launch and perform core capture, browse, and search flows with no login.
- The app can launch and perform core capture, browse, and search flows without contacting a remote backend.

## 6. Constraints

- Desktop app only.
- Single-user only.
- Local-first only.
- No AI in v1.
- No auth in v1.
- No sync in v1.
- The UI and core app flow must remain understandable without onboarding.
- Only must-have items may enter the initial implementation plan.
- If a requested feature is not in this PRD, it must not be built.

## 7. Blocked unknowns that affect implementation

None currently block initial implementation.

These decisions are considered resolved for v1:
- Link metadata fetching from the internet is out of scope.
- Nested collections are out of scope.
- Failed file parsing does not block storage of the item, but it does block indexing of that item.

## 8. Success conditions for v1

StackDrop v1 is done only when:
- every must-have item in this PRD is implemented
- every must-have flow has at least one verification artifact
- no out-of-scope feature was added
- the delivered app still matches this PRD
