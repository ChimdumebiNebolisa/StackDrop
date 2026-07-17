# File-type capability registry design

Date: 2026-07-17
Scope: Phase 2.1 design for the canonical file-type capability registry and generation boundary.

This document defines the target boundary only. It does not add new supported formats, change runtime behavior, or replace existing handwritten extension lists yet.

## Problem statement

StackDrop currently supports `txt`, `pdf`, `docx`, and `doc`, but that set is repeated in Rust discovery, TypeScript types, watcher filtering, parser routing, SQLite checks, migrations, UI filters, tests, and documentation. Phase 2 must introduce one canonical capability source without leaving two active registries that can drift.

The registry must support current behavior first, then allow Phase 3 formats to be added end to end.

## Canonical source

Use a repository-local JSON file as the authoritative source:

```text
src/shared/fileCapabilities.json
```

JSON is the safest initial boundary because both Node and Rust can parse it with existing dependencies or standard tooling, and it can be validated without introducing a new build-time language. The file should be committed and reviewed like source code.

Each entry should have this shape:

```json
{
  "extension": "pdf",
  "displayLabel": "PDF",
  "parserId": "pdf-text",
  "mimeHints": ["application/pdf"],
  "maxFileSizeBytes": 52428800,
  "ocr": {
    "supported": true,
    "parserId": "pdf-ocr"
  },
  "parseRuntime": "hybrid",
  "defaultEnabled": true
}
```

Required fields:

| Field | Purpose |
|-------|---------|
| `extension` | Lowercase extension without the dot. This is the stable identifier used by discovery, filters, database constraints, and tests. |
| `displayLabel` | UI and documentation label. It must not imply support beyond the extension entry. |
| `parserId` | Stable parser route identifier for parsed text extraction. |
| `mimeHints` | Optional MIME hints for future diagnostics or parser checks. Hints are not security decisions. |
| `maxFileSizeBytes` | Per-format read/parse limit. Current global read containment still remains the hard upper guard. |
| `ocr.supported` | Whether OCR fallback is allowed for this extension. |
| `ocr.parserId` | OCR route identifier when OCR is supported. |
| `parseRuntime` | `browser` for TypeScript/browser-safe parsing, `native` for Rust/native tool parsing, or `hybrid` when browser parsing can fall back to native commands. |
| `defaultEnabled` | Whether the format is active by default. Unsupported or evaluated-only formats must not appear as enabled entries. |

## Initial entries

The first implementation should encode only the current active formats:

| Extension | Label | Parser id | Runtime | OCR | Default |
|-----------|-------|-----------|---------|-----|---------|
| `txt` | Text | `txt-utf8` | `browser` | No | Enabled |
| `pdf` | PDF | `pdf-text` | `hybrid` | Yes, `pdf-ocr` | Enabled |
| `docx` | Word document | `docx-mammoth` | `browser` | No | Enabled |
| `doc` | Legacy Word document | `doc-antiword` | `native` | No | Enabled |

Do not add `.md`, `.log`, or other Tier 1 entries until their complete Phase 3 vertical slices are implemented.

## Generated artifacts

The registry should produce checked-in generated artifacts rather than requiring Rust or TypeScript to read JSON dynamically during normal app execution.

Target generated files:

```text
src/domain/documents/generatedFileCapabilities.ts
src-tauri/src/generated_file_capabilities.rs
src/data/db/generatedFileCapabilities.ts
docs/generated/supported-formats.md
```

Generated TypeScript should expose:

- `SUPPORTED_FILE_CAPABILITIES`
- `SUPPORTED_FILE_EXTENSIONS`
- `FileExtension`
- `isSupportedFileExtension(value: string): value is FileExtension`
- UI filter labels derived from the same entries

Generated Rust should expose:

- `SUPPORTED_FILE_EXTENSIONS`
- `supported_extension(path: &Path) -> Option<&'static str>` or equivalent
- parser/runtime metadata needed by discovery-side validation

Generated database helpers should expose:

- allowed-extension SQL fragments for schema and migrations
- a stable ordered extension list for migration tests

Generated documentation should list only enabled formats and parser limitations already implemented.

## Validation boundary

Add one Node-based validation command before migrating consumers:

```text
scripts/validate-file-capabilities.mjs
```

The validator should:

1. Parse `src/shared/fileCapabilities.json`.
2. Enforce unique lowercase extensions.
3. Enforce required fields and allowed enum values.
4. Enforce positive integer `maxFileSizeBytes`.
5. Reject OCR metadata when `ocr.supported` is false.
6. Generate expected Rust, TypeScript, SQL-helper, and documentation output in memory.
7. Compare expected output to checked-in generated files.
8. Exit non-zero when checked-in generated files are missing or stale.

Generation and validation should use the same script implementation with separate modes:

```text
node scripts/validate-file-capabilities.mjs --write
node scripts/validate-file-capabilities.mjs --check
```

`--write` updates generated files. `--check` fails on drift and is suitable for CI.

## Migration order

Phase 2 should proceed in this order:

1. Add canonical JSON, generator, generated artifacts, and drift validation while keeping existing runtime consumers unchanged.
2. Migrate TypeScript type and UI consumers to generated TypeScript.
3. Migrate watcher filtering to generated TypeScript.
4. Migrate Rust discovery to generated Rust.
5. Migrate parser routing and diagnostics to capability metadata.
6. Migrate schema and migration allowed-extension checks to generated database helpers.
7. Generate supported-format documentation from the same source.
8. Remove obsolete handwritten lists and add drift-regression tests.

This order keeps every active consumer backed by either the old behavior or checked generated artifacts, never an unchecked parallel source.

## Consumer contract

Every enabled capability must be connected to these consumers before it is documented as supported:

| Consumer | Required registry use |
|----------|-----------------------|
| Rust discovery | Accept only enabled extensions from generated Rust data. |
| Native file commands | Check parser-specific extensions against generated route metadata. |
| TypeScript domain types | Use generated `FileExtension`; avoid handwritten unions. |
| Watcher filtering | Use generated enabled-extension set. |
| Parser routing | Route by generated `parserId` and `parseRuntime`. |
| SQLite schema | Use generated allowed-extension list in `schema.sql` or generated schema helper. |
| Migrations | Use generated allowed-extension list for final-schema detection and cleanup. |
| Search filters | Accept only generated `FileExtension` values. |
| UI filters | Render labels from generated capabilities. |
| Diagnostics | Use capability metadata for supported-format wording; unsupported skipped counts remain unavailable until separately implemented. |
| Tests | Assert generated outputs and runtime consumers agree. |
| Documentation | Use generated supported-format output for user-visible claims. |

## Limits and safety

- `maxFileSizeBytes` is a format-specific limit, not permission to bypass root containment or the existing Rust read cap.
- MIME hints are diagnostic hints only. Extension and root containment remain the active security gates.
- Native parser entries must keep all filesystem access behind root-contained Rust commands.
- OCR support must remain opt-in per extension.
- Disabled or deferred entries must not be accepted by discovery, filters, schema, or UI.

## Open decisions for implementation

- Whether `schema.sql` should be generated entirely or whether generated SQL fragments should be inserted manually. The first implementation should prefer generated fragments/helpers to keep migration review simple.
- Whether parser limits are stored in the database for future reindex decisions. Current design does not persist parser capability signatures; that remains a later schema decision.
- Whether unsupported-file diagnostics should be added. Current discovery skips unsupported files and does not count them, so diagnostics must not claim unsupported counts until a later work unit changes discovery output.

## Verification target

Phase 2.2 should verify at minimum:

```text
node scripts/validate-file-capabilities.mjs --check
npm run typecheck
npm run test -- src/tests/unit/watchIndexedFolders.test.ts src/tests/integration/folderScan.v1.test.ts src/tests/unit/parseDiscoveredFile.test.ts src/tests/integration/migrate.docx.test.ts src/tests/integration/migrate.fts-v2.test.ts
cd src-tauri && cargo test
git diff --check
```

Broader verification should be added as consumers are migrated.
