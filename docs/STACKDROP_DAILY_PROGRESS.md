# StackDrop Daily Roadmap Progress

Last updated: 2026-07-22
Current roadmap phase: Phase 2 - Canonical file-type capability registry
Current in-progress work unit: None; next is 2.6 Generate or validate supported-format documentation

## Ordered work-unit checklist

### Phase 1 - Baselines and system inventory

- [x] 1.1 Establish TypeScript, frontend, Rust, build, formatting, lint, unit, E2E, and packaging baselines.
- [x] 1.2 Record current search accuracy behavior.
- [x] 1.3 Add or document representative deterministic latency fixtures.
- [x] 1.4 Inventory every supported-extension declaration or assumption.
- [x] 1.5 Map database schema and migration implications for ranking, metadata, and file-type expansion.
- [x] 1.6 Create the initial producer-to-consumer architecture and blast-radius map.

### Phase 2 - Canonical file-type capability registry

- [x] 2.1 Design the registry and generation boundary.
- [x] 2.2 Add canonical source data and cross-language validation.
- [x] 2.3 Migrate TypeScript consumers.
- [x] 2.4 Migrate Rust discovery and watcher consumers.
- [x] 2.5 Migrate parser routing and diagnostics.
- [ ] 2.6 Generate or validate supported-format documentation.
- [ ] 2.7 Remove obsolete handwritten extension lists.
- [ ] 2.8 Add drift-regression tests.

### Phase 3 - Tier 1 file formats

- [ ] 3.1 Markdown (`.md`, `.markdown`) vertical slice.
- [ ] 3.2 Log (`.log`) vertical slice.
- [ ] 3.3 CSV (`.csv`) vertical slice.
- [ ] 3.4 JSON (`.json`) vertical slice.
- [ ] 3.5 YAML (`.yaml`, `.yml`) vertical slice.
- [ ] 3.6 XML (`.xml`) vertical slice.
- [ ] 3.7 HTML (`.html`, `.htm`) vertical slice.

### Phase 4 - Tier 2 format evaluation and implementation

- [ ] 4.1 Evaluate and, only when safe, implement `.pptx`.
- [ ] 4.2 Evaluate and, only when safe, implement `.xlsx`.
- [ ] 4.3 Evaluate and, only when safe, implement `.odt`.
- [ ] 4.4 Evaluate and, only when safe, implement `.ods`.
- [ ] 4.5 Evaluate and, only when safe, implement `.epub`.

### Phase 5 - Search semantics

- [ ] 5.1 Document current ranking behavior with deterministic fixtures.
- [ ] 5.2 Combine exact-token and prefix candidates.
- [ ] 5.3 Preserve and test exact-filename priority.
- [ ] 5.4 Add filename-stem and filename-prefix behavior.
- [ ] 5.5 Add filename-token behavior.
- [ ] 5.6 Add relative-path ranking.
- [ ] 5.7 Add lower-ranked OR fallback.
- [ ] 5.8 Add limited filename/path typo tolerance.
- [ ] 5.9-5.14 Add folder, extension, parser-status, date, size filters and result limits/pagination as separate slices.
- [ ] 5.15-5.18 Add match explainability, snippet hardening, sort preservation, and query edge-case coverage as separate slices.

### Phase 6 - Performance and indexing correctness

- [ ] 6.1-6.7 Add deterministic scale fixtures, measurements, query-plan inspection, and evidence-based indexes as separate slices.
- [ ] 6.8-6.10 Verify transactional consistency, migrations, and reindex behavior as separate slices.
- [ ] 6.11-6.13 Evaluate and either safely implement resume behavior or record a deferred design.

### Phase 7 - Security, packaging, and CI

- [ ] 7.1-7.4 Add PR CI for TypeScript, frontend, Rust, formatting, and clippy as separate slices.
- [ ] 7.5-7.10 Harden CSP and filesystem boundaries as separate slices.
- [ ] 7.11-7.16 Add dependency audits, toolchain pinning, checksums, SBOM, and signing deferral documentation as separate slices.

### Phase 8 - Documentation and final reconciliation

- [ ] 8.1-8.10 Reconcile architecture, supported formats, limitations, search, migrations, diagnostics, and verification documentation as bounded slices.
- [ ] 8.11 Reconcile every roadmap claim against the repository.
- [ ] 8.12 Produce the explicit deferred backlog.

## Completed work units

- 1.1 Establish verification baselines (2026-07-11). TypeScript, unit/integration, frontend build, E2E, Rust tests, formatting, and Windows packaging pass. Strict Clippy has four existing findings. No JavaScript/TypeScript lint command is configured.
- 1.2 Record current search accuracy behavior (2026-07-12). Added `docs/SEARCH_ACCURACY_BASELINE.md`, tracing `queryDocuments` to `DocumentSearchRepository`, SQLite FTS ranking, prefix/fallback behavior, filters, snippets, coverage, and known gaps. Verified with the focused search accuracy suite: 1 file and 22 tests passed.
- 1.3 Add or document representative deterministic latency fixtures (2026-07-13). Added generated in-memory search-latency fixture definitions in `src/tests/fixtures/searchLatencyFixtures.ts`, focused verification in `src/tests/unit/searchLatencyFixtures.test.ts`, and documentation in `docs/SEARCH_LATENCY_FIXTURES.md`. The fixture covers exact filename, prefix, relative path, body-only, and filename/path fallback query paths without changing runtime search semantics. Verified with focused fixture tests, adjacent search accuracy tests, and TypeScript typecheck.
- 1.4 Inventory every supported-extension declaration or assumption (2026-07-14). Added `docs/SUPPORTED_EXTENSION_INVENTORY.md`, tracing the current `txt` / `pdf` / `docx` / `doc` assumptions across Rust discovery, native OCR/DOC commands, TypeScript types, parser dispatch, scan persistence, watcher filtering, SQLite schema/migrations, repositories, UI filters, diagnostics, tests, fixtures, and docs. Verified with focused watch/scan/parser tests, TypeScript typecheck, and diff hygiene.
- 1.5 Map database schema and migration implications (2026-07-15). Added `docs/DATABASE_SCHEMA_MIGRATION_MAP.md`, tracing the current schema contract, document/FTS flow, query-time ranking, metadata dependencies, file-type expansion constraints, migration paths, index consumers, and transactional consistency implications. Linked it from `docs/DATABASE.md`. Verified with focused migration, diagnostics, repository, search, and folder-scan tests plus diff hygiene.
- 1.6 Create the initial producer-to-consumer architecture and blast-radius map (2026-07-16). Added `docs/PRODUCER_CONSUMER_ARCHITECTURE.md`, tracing manual indexing, background watcher indexing, parser routing, filesystem boundaries, SQLite metadata, FTS sync, query/ranking, diagnostics, UI consumers, and roadmap blast-radius risks. Linked it from `docs/stackdrop-architecture.md`. Verified with focused scan/search/diagnostics/watcher/parser tests plus diff hygiene.
- 2.1 Design the registry and generation boundary (2026-07-17). Added `docs/CAPABILITY_REGISTRY_DESIGN.md`, defining the canonical JSON source, required capability fields, current four-format seed entries, checked-in generated artifact targets, validation/generation command boundary, migration order, consumer contract, limits, open implementation decisions, and verification target. Linked it from `docs/stackdrop-architecture.md`. Verified with focused extension/migration-adjacent tests, TypeScript typecheck, and diff hygiene.
- 2.2 Add canonical source data and cross-language validation (2026-07-18). Added `src/shared/fileCapabilities.json` with the current four active formats only, a single Node generator/validator with `--write` and `--check` modes, checked-in generated TypeScript/Rust/database/documentation artifacts, package scripts for generation/checking, and Rust module exposure so the generated Rust artifact compiles during `cargo test`. Runtime consumers intentionally remain unmigrated until Phase 2.3-2.5. Verified with capability drift validation, TypeScript typecheck, focused extension/migration-adjacent tests, Rust tests, and diff hygiene.
- 2.3 Migrate TypeScript consumers (2026-07-20). Replaced the handwritten TypeScript `FileExtension` union with the generated capability type and rendered the document library file-type filter from generated extension filter options. Added regression coverage that the generated TypeScript extension list and filter options derive from the same capability entries. Watcher filtering, parser routing, Rust discovery, SQLite schema/migrations, and documentation generation remain deferred to their ordered Phase 2 slices. Verified with capability drift validation, focused Vitest coverage, TypeScript typecheck, focused Playwright UI coverage, and diff hygiene.
- 2.4 Migrate Rust discovery and watcher consumers (2026-07-21). Replaced the Rust discovery handwritten extension matcher with `generated_file_capabilities::supported_extension` and replaced the TypeScript watcher event set with `SUPPORTED_FILE_EXTENSIONS` from generated TypeScript capabilities. Added regression coverage that discovery accepts every generated Rust extension and skips unsupported extensions, and that native watcher events dirty folders for every generated TypeScript extension while ignoring known unsupported extensions. Verified with capability drift validation, focused and broader affected Vitest coverage, TypeScript typecheck, full Rust tests, Rust formatting, and diff hygiene.
- 2.5 Migrate parser routing and diagnostics (2026-07-22). Added generated TypeScript and Rust capability lookup helpers, routed browser parser dispatch through generated `parserId`/`parseRuntime`, routed scan-level native and OCR parser decisions through generated capability metadata, and changed Rust native parser extension gates to generated parser/OCR parser metadata. Diagnostics now returns generated supported-format metadata and the document library diagnostics/about copy derives supported-format wording from diagnostics rather than a handwritten TXT/PDF/DOCX/DOC sentence. Added regression coverage for generated lookup helpers, native/OCR scan routing, and diagnostics supported-format metadata. Verified with capability drift validation, focused and full Vitest coverage, TypeScript typecheck, full Rust tests, Rust formatting, and diff hygiene.

## Current work-unit blast radius

Completed 2.5 on 2026-07-22. Browser parser dispatch, scan-level native/OCR parser routing, Rust native parser extension gates, diagnostics metadata, and diagnostics/about UI supported-format wording now derive from generated capability metadata. The active `txt`, `pdf`, `docx`, and `doc` behavior is preserved. SQLite schema/migrations, generated documentation inclusion in user docs, Tauri capability files, packaging, and obsolete handwritten schema lists are intentionally unchanged until later Phase 2 slices.

## Deferred items

- All later roadmap units remain deferred until their prerequisites are complete.
- Phase 2 remaining consumer migration remains deferred: SQLite schema/migrations, generated documentation inclusion, obsolete list removal, and additional drift-regression tests.
- Phase 2 schema consumption remains deferred; 2.2 generates database SQL-helper constants but does not rewrite `schema.sql` or migration cleanup logic.
- Larger 10,000-document and 100,000-document generated corpora remain deferred to Phase 6 performance work; this unit defines a small representative corpus and does not commit generated databases or latency thresholds.
- Strict Clippy cleanup is deferred to its ordered Phase 7 formatting/clippy work unit; the findings do not block the passing documented build or test commands.
- Phase 5 search semantic improvements remain deferred; the new baseline document records current behavior and known gaps without changing ranking.

## Blockers

None. Baseline failures are recorded below rather than treated as blockers.

## Commands executed

- 2026-07-12: `git status --short` - exit 0; observed pre-existing modified proof screenshots, `src-tauri/Cargo.toml`, and generated Tauri schema files.
- 2026-07-12: Repository/documentation inspection commands for `AGENTS.md`, `README.md`, architecture docs, database docs, API docs, QA audit, package manifests, search code, and search tests - exit 0 except one exploratory `rg` command exited 1 because the non-existent top-level `tests` path was included; it still returned repository search matches.
- 2026-07-12: `npm run test -- src/tests/unit/searchAccuracy.test.ts` - exit 0; 1 test file and 22 tests passed. Run before documentation edits and again after self-review.
- 2026-07-12: `git diff --check` - exit 0; no whitespace errors. Git emitted line-ending warnings for existing Windows checkout behavior.
- 2026-07-13: `git status --short` - exit 0; observed pre-existing modified proof screenshots, `src-tauri/Cargo.toml`, and generated Tauri schema files before this run's edits.
- 2026-07-13: Repository/documentation inspection commands for `AGENTS.md`, `README.md`, architecture docs, database docs, package manifest, release workflow, search repository, migrations, and search tests - exit 0 except one broad exploratory `rg` command timed out after returning relevant matches; narrower follow-up reads succeeded.
- 2026-07-13: `npm run test -- src/tests/unit/searchAccuracy.test.ts` - exit 0; 1 test file and 22 tests passed as the baseline command before edits and again after fixture edits.
- 2026-07-13: `npm run test -- src/tests/unit/searchLatencyFixtures.test.ts` - exit 0; first pass 1 file and 2 tests passed, then rerun after self-review timestamp fix with 1 file and 2 tests passed.
- 2026-07-13: `npm run typecheck` - exit 0.
- 2026-07-14: `git status --short` - exit 0; observed pre-existing modified proof screenshots, `src-tauri/Cargo.toml`, and generated Tauri schema files before this run's edits.
- 2026-07-14: Required inspection commands for `AGENTS.md`, `README.md`, architecture docs, database/API docs, package/Cargo manifests, relevant source, tests, migrations, workflows, and extension searches - exit 0 except broad exploratory `rg` commands exited 1 when invalid/missing glob paths were included while still returning relevant matches; narrowed follow-up reads succeeded.
- 2026-07-14: `npm run test -- src/tests/unit/watchIndexedFolders.test.ts src/tests/integration/folderScan.v1.test.ts src/tests/unit/parseDiscoveredFile.test.ts` - exit 0 before edits; 3 files and 30 tests passed.
- 2026-07-14: `npm run test -- src/tests/unit/watchIndexedFolders.test.ts src/tests/integration/folderScan.v1.test.ts src/tests/unit/parseDiscoveredFile.test.ts` - exit 0 after inventory/self-review; 3 files and 30 tests passed.
- 2026-07-14: `npm run typecheck` - exit 0.
- 2026-07-14: `git diff --check` - exit 0; Git emitted line-ending warnings for existing Windows checkout behavior.
- 2026-07-15: `git status --short` - exit 0; observed pre-existing modified proof screenshots, `src-tauri/Cargo.toml`, and generated Tauri schema files before this run's edits.
- 2026-07-15: Required inspection commands for `AGENTS.md`, `README.md`, architecture docs, database docs, package/Cargo manifests, schema, migrations, repositories, search, scan orchestration, diagnostics, relevant tests, and supported-extension inventory - exit 0 except one broad exploratory `rg` command timed out while scanning source; narrowed follow-up reads succeeded.
- 2026-07-15: `npm run test -- src/tests/integration/migrate.docx.test.ts src/tests/integration/migrate.fts-v2.test.ts src/tests/integration/indexDiagnostics.test.ts src/tests/unit/repositories.v1.test.ts` - exit 0 before edits; 4 files and 11 tests passed.
- 2026-07-15: `npm run test -- src/tests/integration/migrate.docx.test.ts src/tests/integration/migrate.fts-v2.test.ts src/tests/integration/indexDiagnostics.test.ts src/tests/unit/repositories.v1.test.ts src/tests/unit/searchAccuracy.test.ts src/tests/integration/folderScan.v1.test.ts` - exit 0 after documentation/self-review; 6 files and 56 tests passed.
- 2026-07-15: `git diff --check` - exit 0; Git emitted line-ending warnings for existing Windows checkout behavior.
- 2026-07-16: `git status --short` - exit 0; observed pre-existing modified proof screenshots, `src-tauri/Cargo.toml`, and generated Tauri schema files before this run's edits.
- 2026-07-16: Required inspection commands for `AGENTS.md`, `README.md`, architecture docs, API docs, database docs, schema/migration maps, supported-extension inventory, package/Cargo manifests, release workflow, Rust commands, path utilities, folder scan/watch/parser services, search repository, diagnostics service, domain types, and UI consumers - exit 0 except one path-inspection command exited 1 because `src-tauri/src/commands/path_utils.rs` does not exist; the correct file is `src-tauri/src/path_utils.rs`.
- 2026-07-16: `npm run test -- src/tests/integration/folderScan.v1.test.ts src/tests/unit/searchAccuracy.test.ts src/tests/integration/indexDiagnostics.test.ts src/tests/unit/watchIndexedFolders.test.ts src/tests/unit/parseDiscoveredFile.test.ts` - exit 0 before edits; 5 files and 56 tests passed.
- 2026-07-16: `npm run test -- src/tests/integration/folderScan.v1.test.ts src/tests/unit/searchAccuracy.test.ts src/tests/integration/indexDiagnostics.test.ts src/tests/unit/watchIndexedFolders.test.ts src/tests/unit/parseDiscoveredFile.test.ts` - exit 0 after documentation/self-review; 5 files and 56 tests passed.
- 2026-07-16: `git diff --check` - exit 0; Git emitted line-ending warnings for existing Windows checkout behavior and pre-existing modified Tauri files.
- 2026-07-17: `git status --short` - exit 0; observed pre-existing modified proof screenshots, `src-tauri/Cargo.toml`, and generated Tauri schema files before this run's edits.
- 2026-07-17: Required inspection commands for `AGENTS.md`, `README.md`, architecture docs, database/schema implication docs, supported-extension inventory, package/Cargo manifests, release workflow, Rust discovery/native parser commands, TypeScript document types, and extension searches - exit 0.
- 2026-07-17: `npm run test -- src/tests/unit/watchIndexedFolders.test.ts src/tests/integration/folderScan.v1.test.ts src/tests/unit/parseDiscoveredFile.test.ts src/tests/integration/migrate.docx.test.ts src/tests/integration/migrate.fts-v2.test.ts` - exit 0 before edits; 5 files and 35 tests passed.
- 2026-07-17: `npm run test -- src/tests/unit/watchIndexedFolders.test.ts src/tests/integration/folderScan.v1.test.ts src/tests/unit/parseDiscoveredFile.test.ts src/tests/integration/migrate.docx.test.ts src/tests/integration/migrate.fts-v2.test.ts` - exit 0 after first documentation pass; 5 files and 35 tests passed.
- 2026-07-17: `npm run typecheck` - exit 0 after first documentation pass.
- 2026-07-17: `npm run test -- src/tests/unit/watchIndexedFolders.test.ts src/tests/integration/folderScan.v1.test.ts src/tests/unit/parseDiscoveredFile.test.ts src/tests/integration/migrate.docx.test.ts src/tests/integration/migrate.fts-v2.test.ts` - exit 0 after self-review corrections; 5 files and 35 tests passed.
- 2026-07-17: `npm run typecheck` - exit 0 after self-review corrections.
- 2026-07-17: `git diff --check` - exit 0; Git emitted line-ending warnings for existing Windows checkout behavior and pre-existing modified Tauri files.
- 2026-07-18: `git status --short` - exit 0; observed pre-existing modified proof screenshots, `src-tauri/Cargo.toml`, and generated Tauri schema files before this run's edits.
- 2026-07-18: Required inspection commands for automation memory, `AGENTS.md`, `README.md`, architecture docs, capability registry design, supported-extension inventory, producer-to-consumer map, package/Cargo manifests, source extension consumers, migrations, workflows, and relevant tests - exit 0.
- 2026-07-18: `npm run test -- src/tests/unit/watchIndexedFolders.test.ts src/tests/integration/folderScan.v1.test.ts src/tests/unit/parseDiscoveredFile.test.ts src/tests/integration/migrate.docx.test.ts src/tests/integration/migrate.fts-v2.test.ts` - exit 0 before edits; 5 files and 35 tests passed.
- 2026-07-18: `node scripts/validate-file-capabilities.mjs --check` - exit 0 after implementation; validated 4 file capabilities and 4 generated artifacts.
- 2026-07-18: `npm run typecheck` - exit 0 after implementation.
- 2026-07-18: `npm run test -- src/tests/unit/watchIndexedFolders.test.ts src/tests/integration/folderScan.v1.test.ts src/tests/unit/parseDiscoveredFile.test.ts src/tests/integration/migrate.docx.test.ts src/tests/integration/migrate.fts-v2.test.ts` - exit 0 after implementation; 5 files and 35 tests passed.
- 2026-07-18: `cargo test` - first run timed out at 120 seconds after reporting 16 tests passed; treated as inconclusive and rerun with a longer timeout.
- 2026-07-18: `cargo test` - exit 0 after self-review module exposure; 16 Rust tests passed and generated Rust artifact compiled.
- 2026-07-18: `npm run check:file-capabilities` - exit 0; validated 4 file capabilities and 4 generated artifacts through the package script.
- 2026-07-18: `git diff --check` - exit 0; Git emitted line-ending warnings for existing Windows checkout behavior and pre-existing modified Tauri files.
- 2026-07-20: `git status --short` - exit 0; observed pre-existing modified proof screenshots, `src-tauri/Cargo.toml`, and generated Tauri schema files before this run's edits.
- 2026-07-20: Required inspection commands for automation memory, `AGENTS.md`, `README.md`, capability registry design, generated capability artifacts, TypeScript document types, document library UI, E2E filter coverage, and TypeScript extension searches - exit 0 except exploratory PowerShell quoting mistakes that were rerun with safer quoting.
- 2026-07-20: `npm run test -- src/tests/e2e/web-shell.spec.ts src/tests/unit/searchAccuracy.test.ts` - exit 0 before edits; Vitest only ran the matching unit test file, so 1 file and 22 tests passed. The E2E path was not a Vitest suite and was treated as insufficient UI baseline evidence.
- 2026-07-20: `npm run check:file-capabilities` - exit 0 after implementation; validated 4 file capabilities and 4 generated artifacts.
- 2026-07-20: `npm run test -- src/tests/unit/generatedFileCapabilities.test.ts src/tests/unit/searchAccuracy.test.ts` - first run exit 0; 2 files and 24 tests passed.
- 2026-07-20: `npm run typecheck` - first run exit 1; `types.ts` re-exported `FileExtension` without importing it for local interface use.
- 2026-07-20: `npm run check:file-capabilities` - exit 0 after type import fix; validated 4 file capabilities and 4 generated artifacts.
- 2026-07-20: `npm run test -- src/tests/unit/generatedFileCapabilities.test.ts src/tests/unit/searchAccuracy.test.ts` - exit 0 after type import fix; 2 files and 24 tests passed.
- 2026-07-20: `npm run typecheck` - exit 0 after type import fix.
- 2026-07-20: `npx playwright test src/tests/e2e/web-shell.spec.ts -g "indexes all supported file fixtures"` - exit 0; 1 Chromium E2E test passed in 1.5 minutes, with existing pdf.js object-indexing warnings.
- 2026-07-20: `git diff --check` - exit 0; Git emitted line-ending warnings for existing Windows checkout behavior and pre-existing modified Tauri files.
- 2026-07-21: `git status --short` - exit 0; observed pre-existing modified proof screenshots, `src-tauri/Cargo.toml`, and generated Tauri schema files before this run's edits.
- 2026-07-21: Required inspection commands for automation memory, `AGENTS.md`, `README.md`, architecture docs, capability registry design, package/Cargo manifests and lockfiles, release workflow, generated capability artifacts, Rust discovery/native command code, TypeScript watcher code, scan orchestration, and focused tests - exit 0 except one exploratory `rg` command exited 1 from PowerShell quoting and was rerun successfully.
- 2026-07-21: `npm run test -- src/tests/unit/watchIndexedFolders.test.ts src/tests/unit/generatedFileCapabilities.test.ts` - exit 0 before edits; 2 files and 3 tests passed.
- 2026-07-21: `cargo test discover_tests` - exit 0 before edits; 11 Rust tests passed.
- 2026-07-21: `npm run check:file-capabilities` - exit 0 after implementation; validated 4 capabilities and 4 generated artifacts.
- 2026-07-21: `npm run test -- src/tests/unit/watchIndexedFolders.test.ts src/tests/unit/generatedFileCapabilities.test.ts` - first after implementation exit 0; 2 files and 5 tests passed.
- 2026-07-21: `npm run typecheck` - first after implementation exit 1; new watcher tests returned `vi.fn()` with an inferred constructable mock type instead of `UnwatchFn`.
- 2026-07-21: `cargo test discover_tests` - exit 0 after implementation; 11 Rust tests passed.
- 2026-07-21: `npm run typecheck` - exit 0 after tightening watcher test unwatch mocks.
- 2026-07-21: `npm run test -- src/tests/unit/watchIndexedFolders.test.ts src/tests/unit/generatedFileCapabilities.test.ts` - exit 0 after test typing fix; 2 files and 5 tests passed.
- 2026-07-21: `rg -n 'const SUPPORTED_EXTENSIONS|"txt" \| "pdf"|\["txt", "pdf", "docx", "doc"\]|supported_extension\(' src src-tauri\src -g '!target'` - exit 0; active matches are generated helper plus migrated Rust/watcher call sites.
- 2026-07-21: `cargo fmt --check` - exit 0.
- 2026-07-21: `npm run test -- src/tests/unit/watchIndexedFolders.test.ts src/tests/unit/generatedFileCapabilities.test.ts src/tests/integration/folderScan.v1.test.ts src/tests/unit/parseDiscoveredFile.test.ts` - exit 0 after self-review; 4 files and 34 tests passed.
- 2026-07-21: `cargo test` - exit 0 after self-review; 16 Rust tests passed.
- 2026-07-21: `npm run check:file-capabilities` - exit 0 after self-review; validated 4 capabilities and 4 generated artifacts.
- 2026-07-21: `npm run typecheck` - exit 0 after self-review.
- 2026-07-21: `git diff --check` - exit 0; Git emitted line-ending warnings for existing Windows checkout behavior and pre-existing modified Tauri files.
- `git status --short` - exit 0; four pre-existing modified proof screenshots observed.
- Repository/documentation inspection commands - exit 0 except the first memory lookup, which exited 1 because `CODEX_HOME` was unset; the configured path was then checked directly and no prior memory existed.
- Initial parallel baseline orchestration - timed out after about 244 seconds before returning individual results; treated as inconclusive and rerun individually.
- `npm run typecheck` - exit 0.
- `npm run test` - exit 0; 10 files and 66 tests passed.
- `npm run build` - exit 0; Vite built 341 modules with an existing chunk-size warning.
- `npm run test:e2e` - exit 0; 9 tests passed using Chromium, with repeated pdf.js object-indexing warnings.
- `cd src-tauri && cargo test` - exit 0; 16 tests passed.
- `cd src-tauri && cargo fmt --check` - exit 0.
- `cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings` - exit 101; four findings: one unused function, one `manual_find`, and two `needless_borrow` findings. These existed before this evidence-only work unit.
- JavaScript/TypeScript lint baseline - unavailable because `package.json` defines no lint script and no ESLint configuration is present.
- `npm run tauri -- build` - exit 0; generated the Windows MSI and NSIS bundles locally. Warnings: the bundle identifier ends in `.app`, one Rust dead-code warning, and the same Vite chunk-size warning.
- 2026-07-22: `git status --short` - exit 0; observed pre-existing modified proof screenshots and generated Tauri schema files before this run's edits.
- 2026-07-22: Required inspection commands for automation memory, `AGENTS.md`, `README.md`, architecture docs, capability registry design, supported-extension inventory, package/Cargo manifests, release workflow, generated capability artifacts, parser routing, diagnostics, UI diagnostics consumers, Rust native parser gates, and relevant tests - exit 0.
- 2026-07-22: `npm run test -- src/tests/unit/parseDiscoveredFile.test.ts src/tests/integration/indexDiagnostics.test.ts src/tests/unit/generatedFileCapabilities.test.ts` - exit 0 before edits; 3 files and 12 tests passed.
- 2026-07-22: `npm run generate:file-capabilities` - exit 0 after generator helper implementation; wrote 4 generated capability artifacts.
- 2026-07-22: `npm run check:file-capabilities` - exit 0 after implementation; validated 4 capabilities and 4 generated artifacts.
- 2026-07-22: `npm run test -- src/tests/unit/parseDiscoveredFile.test.ts src/tests/integration/indexDiagnostics.test.ts src/tests/unit/generatedFileCapabilities.test.ts src/tests/unit/parseFile.pdf.test.ts src/tests/unit/parseFile.docx.test.ts` - exit 0 after implementation; 5 files and 18 tests passed.
- 2026-07-22: `npm run typecheck` - exit 0 after implementation.
- 2026-07-22: `cargo test discover_tests` - first run timed out after 184 seconds while waiting on Cargo artifact locking; treated as inconclusive and rerun with a longer timeout.
- 2026-07-22: `cargo test discover_tests` - exit 0 on rerun; 11 Rust tests passed.
- 2026-07-22: `npm run test -- src/tests/unit/parseDiscoveredFile.test.ts src/tests/integration/indexDiagnostics.test.ts src/tests/unit/generatedFileCapabilities.test.ts src/tests/unit/parseFile.pdf.test.ts src/tests/unit/parseFile.docx.test.ts src/tests/integration/folderScan.v1.test.ts` - exit 0 after self-review copy fix; 6 files and 41 tests passed.
- 2026-07-22: `npm run typecheck` - exit 0 after self-review.
- 2026-07-22: `npm run check:file-capabilities` - exit 0 after self-review; validated 4 capabilities and 4 generated artifacts.
- 2026-07-22: `cargo test` - exit 0 after self-review; 27 Rust tests passed.
- 2026-07-22: `npm run test` - exit 0; 16 files and 99 tests passed.
- 2026-07-22: `cargo fmt --check` - first run exit 1 because the new generated Rust helper needed rustfmt line wrapping.
- 2026-07-22: `npm run generate:file-capabilities` - exit 0 after fixing the generator template; wrote 4 generated capability artifacts.
- 2026-07-22: `npm run check:file-capabilities` - exit 0 after generator formatting fix; validated 4 capabilities and 4 generated artifacts.
- 2026-07-22: `cargo fmt --check` - exit 0 after generator formatting fix.
- 2026-07-22: `git diff --check` - exit 0; Git emitted line-ending warnings for existing Windows checkout behavior and pre-existing modified files.

## Verification results

- 2026-07-12: Passing targeted search baseline verification: 22 Vitest tests in `src/tests/unit/searchAccuracy.test.ts`.
- 2026-07-12: Passing diff hygiene: `git diff --check`.
- 2026-07-13: Passing focused fixture verification: 2 Vitest tests in `src/tests/unit/searchLatencyFixtures.test.ts`.
- 2026-07-13: Passing adjacent search verification: 22 Vitest tests in `src/tests/unit/searchAccuracy.test.ts`.
- 2026-07-13: Passing TypeScript typecheck.
- 2026-07-14: Passing focused extension-adjacent verification: 30 Vitest tests across watcher, folder scan, and parser routing suites.
- 2026-07-14: Passing TypeScript typecheck.
- 2026-07-14: Passing diff hygiene with only line-ending warnings.
- 2026-07-15: Passing focused schema/migration baseline before edits: 11 Vitest tests across migration, diagnostics, and repository suites.
- 2026-07-15: Passing focused schema/search/scan verification after edits: 56 Vitest tests across migration, diagnostics, repository, search accuracy, and folder-scan suites.
- 2026-07-16: Passing focused producer-to-consumer baseline before edits: 56 Vitest tests across folder scan, search accuracy, diagnostics, watcher, and parser-routing suites.
- 2026-07-16: Passing focused producer-to-consumer verification after edits: 56 Vitest tests across folder scan, search accuracy, diagnostics, watcher, and parser-routing suites.
- 2026-07-16: Passing diff hygiene with only line-ending warnings.
- 2026-07-17: Passing focused extension/migration-adjacent baseline before edits: 35 Vitest tests across watcher, folder scan, parser routing, and migration suites.
- 2026-07-17: Passing focused extension/migration-adjacent verification after self-review corrections: 35 Vitest tests across watcher, folder scan, parser routing, and migration suites.
- 2026-07-17: Passing TypeScript typecheck.
- 2026-07-17: Passing diff hygiene with only line-ending warnings.
- 2026-07-18: Passing capability validation: `node scripts/validate-file-capabilities.mjs --check` and `npm run check:file-capabilities` both validated 4 capabilities and 4 generated artifacts.
- 2026-07-18: Passing TypeScript typecheck.
- 2026-07-18: Passing focused extension/migration-adjacent verification: 35 Vitest tests across watcher, folder scan, parser routing, and migration suites.
- 2026-07-18: Passing Rust verification: 16 tests passed; generated Rust capability artifact is compiled through the crate root.
- 2026-07-18: Passing diff hygiene with only line-ending warnings.
- 2026-07-20: Passing capability drift validation: 4 capabilities and 4 generated artifacts validated.
- 2026-07-20: Passing focused TypeScript capability/search verification: 24 Vitest tests across generated capabilities and search accuracy.
- 2026-07-20: Passing TypeScript typecheck after fixing the local generated type import.
- 2026-07-20: Passing focused browser UI verification: 1 Playwright Chromium test confirmed supported fixtures and file-type filter options remain visible.
- 2026-07-20: Passing diff hygiene with only line-ending warnings.
- 2026-07-21: Passing capability drift validation: 4 capabilities and 4 generated artifacts validated.
- 2026-07-21: Passing focused and broader affected TypeScript verification: 34 Vitest tests across watcher, generated capability, folder scan, and parser-routing suites.
- 2026-07-21: Passing TypeScript typecheck after tightening watcher test unwatch mock typing.
- 2026-07-21: Passing Rust verification: 16 tests passed, including discovery tests that now cover every generated supported extension.
- 2026-07-21: Passing Rust formatting and diff hygiene with only line-ending warnings.
- 2026-07-22: Passing capability drift validation after parser/diagnostics migration and generator formatting fix.
- 2026-07-22: Passing focused parser/diagnostics/generated capability verification: 18 Vitest tests across `parseDiscoveredFile`, `indexDiagnostics`, generated capabilities, and PDF/DOCX parser suites.
- 2026-07-22: Passing broader affected TypeScript verification after self-review: 41 Vitest tests across parser routing, diagnostics, generated capabilities, PDF/DOCX parser suites, and folder-scan integration.
- 2026-07-22: Passing full frontend test suite: 99 Vitest tests across 16 files.
- 2026-07-22: Passing TypeScript typecheck.
- 2026-07-22: Passing Rust verification: 27 tests passed, including native OCR/DOC command tests that now use generated parser metadata for extension gating.
- 2026-07-22: Passing Rust formatting and diff hygiene after fixing the generator template.
- Passing: TypeScript typecheck; 66 Vitest unit/integration tests; frontend production build; 9 Playwright E2E tests; 16 Rust tests; Rust formatting; Windows application and MSI/NSIS packaging.
- Failing baseline: strict Clippy, exit 101, with four existing warnings promoted to errors.
- Unavailable baseline: JavaScript/TypeScript lint, because no lint command/configuration exists.

## Important architectural decisions

- Preserve the local-only Tauri + React + SQLite/FTS5 architecture.
- Treat the modified `docs/proof-screenshots/*.png`, `src-tauri/Cargo.toml`, and generated Tauri schema files as unrelated user work.
- Do not fix baseline findings inside an evidence-only work unit; retain them as evidence for their ordered roadmap work.
- Treat 1.2 as a recorded baseline rather than a search behavior change. Later Phase 5 units must update the baseline/contract when ranking semantics change.
- Treat 1.3 as a deterministic fixture definition rather than a benchmark. Do not add latency thresholds until Phase 6 measurement work defines corpus size, environment controls, and acceptable limits.
- Treat 1.4 as an inventory rather than the Phase 2 registry design. The current effective extension set remains `txt`, `pdf`, `docx`, and `doc`; no new format support is claimed.
- Record `.doc` as a native-only parser path: it is supported through `parseDiscoveredFile` and `extract_doc_text_under_root`, not through browser-safe `parseFileContent`.
- Treat 1.5 as a schema/migration map rather than a schema change. Future file-type expansion must update or generate the SQLite `CHECK` constraint and migration cleanup logic from the same capability source as discovery/parser/UI consumers.
- Treat current ranking as query-time behavior. No persistent ranking metadata, token table, parser version, content hash, or durable scan cursor exists yet.
- Treat 1.6 as a producer/consumer and blast-radius map rather than a new architecture. It records current behavior, including watcher polling, read containment, parser routing, per-file failure isolation, metadata/FTS sync, diagnostics, and UI consumers without changing implementation.
- Treat 2.1 as a design boundary rather than an active registry. The next unit should add canonical JSON, generated artifacts, and a validation command before any runtime consumer migration.
- Use a committed JSON file as the canonical capability source, checked-in generated Rust/TypeScript/database/doc artifacts, and one Node validation/generation script with `--write` and `--check` modes.
- Keep the initial registry entries limited to current active formats: `txt`, `pdf`, `docx`, and `doc`. Tier 1 formats remain absent until their vertical slices are implemented.
- Treat 2.2 as source-data and drift-validation infrastructure rather than runtime consumer migration. Existing handwritten lists are still active until the ordered Phase 2 migration units replace them.
- Compile the generated Rust artifact by exposing it as a crate-root module, but do not call it from Rust discovery until the Rust consumer migration slice.
- Treat 2.3 as the TypeScript domain/UI consumer migration only. The generated `FileExtension` type is now the public document-domain extension type, and the document library file-type filter renders from generated options.
- Treat 2.4 as the Rust discovery and watcher event-filter migration only. The generated extension list is now active for `discover_supported_files` and `watchIndexedFolders`; parser routing, native parser command extension checks, SQLite schema/migrations, diagnostics, and docs remain separate ordered slices.
- Treat 2.5 as parser-routing and diagnostics migration only. Parser route selection now depends on generated `parserId`, `parseRuntime`, and OCR metadata; native commands use generated parser/OCR parser checks after root containment. SQLite schema/migrations and generated documentation inclusion remain deferred to the next ordered Phase 2 slices.

## Files or systems affected

- `docs/SEARCH_ACCURACY_BASELINE.md` added as the recorded current search behavior.
- `docs/SEARCH_LATENCY_FIXTURES.md` added as the representative deterministic search-latency fixture description.
- `docs/SUPPORTED_EXTENSION_INVENTORY.md` added as the supported-extension declaration and assumption inventory.
- `docs/DATABASE_SCHEMA_MIGRATION_MAP.md` added as the database schema, migration, ranking, metadata, file-type expansion, index, and consistency implication map.
- `docs/DATABASE.md` linked to the schema/migration map.
- `docs/PRODUCER_CONSUMER_ARCHITECTURE.md` added as the end-to-end producer-to-consumer architecture and roadmap blast-radius map.
- `docs/stackdrop-architecture.md` linked to the producer-to-consumer map.
- `docs/CAPABILITY_REGISTRY_DESIGN.md` added as the canonical file-type capability registry and generation-boundary design.
- `docs/stackdrop-architecture.md` linked to the capability registry design.
- `src/shared/fileCapabilities.json` added as the canonical source for the current active `txt`, `pdf`, `docx`, and `doc` capabilities.
- `scripts/validate-file-capabilities.mjs` added as the shared generator/validator with `--write` and `--check` modes.
- `src/domain/documents/generatedFileCapabilities.ts`, `src/data/db/generatedFileCapabilities.ts`, `src-tauri/src/generated_file_capabilities.rs`, and `docs/generated/supported-formats.md` added as checked-in generated artifacts.
- `package.json` added `check:file-capabilities` and `generate:file-capabilities` scripts.
- `src-tauri/src/main.rs` exposes the generated Rust module for compilation validation.
- `src-tauri/src/commands/file_commands.rs` now uses generated Rust capability data for discovery extension support and tests discovery against every generated supported extension.
- `src/domain/documents/types.ts` now imports and re-exports the generated `FileExtension` type.
- `src/features/documents/screens/DocumentLibraryScreen.tsx` now renders file-type filter options from generated capability data.
- `src/features/folders/services/watchIndexedFolders.ts` now uses generated TypeScript capability data for native watcher event filtering.
- `scripts/validate-file-capabilities.mjs`, `src/domain/documents/generatedFileCapabilities.ts`, and `src-tauri/src/generated_file_capabilities.rs` now expose generated capability lookup helpers used by parser routing, diagnostics, and native parser extension gates.
- `src/domain/ingestion/parseFile.ts` now dispatches browser-safe parsers by generated `parserId` and rejects native-only routes from the browser parser boundary.
- `src/features/folders/services/parseDiscoveredFile.ts` now routes native parsing and OCR fallback by generated `parseRuntime` and OCR metadata.
- `src-tauri/src/commands/file_commands.rs` now gates OCR and legacy DOC native commands through generated parser/OCR parser metadata after root containment checks.
- `src/features/folders/services/getIndexDiagnostics.ts` now returns generated supported-format metadata for diagnostics consumers.
- `src/features/documents/screens/DocumentLibraryScreen.tsx` now derives diagnostics/about supported-format wording from diagnostics metadata.
- `src/tests/unit/parseDiscoveredFile.test.ts`, `src/tests/integration/indexDiagnostics.test.ts`, and `src/tests/unit/generatedFileCapabilities.test.ts` now cover generated parser routing and diagnostics metadata drift.
- `src/tests/unit/generatedFileCapabilities.test.ts` verifies generated TypeScript extension/filter consumers derive from capability entries and reject unknown extensions.
- `src/tests/unit/watchIndexedFolders.test.ts` verifies native watcher events trigger for every generated supported extension and ignore a known unsupported extension.
- `src/tests/fixtures/searchLatencyFixtures.ts` added as generated in-memory fixture data for search-latency work.
- `src/tests/unit/searchLatencyFixtures.test.ts` added to verify fixture determinism and coverage of current search paths.
- `docs/STACKDROP_DAILY_PROGRESS.md` updated with 1.4 evidence and next work unit.
- Local ignored build outputs under `dist/` and `src-tauri/target/` were produced by verification.

## Known platform-specific behavior that remains unverified

- Windows x64 packaging was verified locally and produced both MSI and NSIS installers.
- Linux and macOS builds/packages were not verified in this Windows environment.
- Installer execution/smoke behavior was not tested; this unit established package generation only.
- No actual latency measurements were taken in 1.3; future Phase 6 work must measure timing under documented environment conditions.
- No Linux/macOS extension-discovery behavior was verified during 1.4; the inventory is based on source inspection and Windows-hosted targeted tests.
- No packaged-app existing-database migration was opened during 1.5; migration behavior was verified through the TypeScript SQLite test harness.
- No Windows junction, reparse-point, UNC traversal, Linux/macOS discovery, long-running watcher stress, or packaged-app existing-database behavior was newly verified during 1.6; those remain source-inspected or deferred to later platform/security units.
- No generated registry artifacts, Rust/TypeScript drift validation command, schema generation, Linux/macOS discovery behavior, packaged-app migration, or runtime consumer migration was verified during 2.1; those remain deferred to Phase 2 implementation units.
- No runtime consumer migration, schema rewrite, migration rewrite, UI filter rewrite, Linux/macOS discovery behavior, packaged-app migration, or generated documentation inclusion in README was verified during 2.2; those remain deferred to later Phase 2 and Phase 8 units.
- No Linux/macOS native OCR/DOC parser behavior, packaged-app parser behavior, SQLite schema/migration rewrite, or generated documentation inclusion in README was newly verified during 2.5; this unit verified Windows-hosted tests and source-level generated parser metadata use.

## Git, merge, release, or deployment actions

- 2026-07-12: Committed the documentation-only 1.2 work unit on `main` as `09d8fae` with message `docs: record search accuracy baseline`, then pushed `main` to `origin` (`6e88824..09d8fae`). No merge, release, or deployment was required.
- 2026-07-13: Committed the 1.3 fixture/test/documentation work unit on `main` with message `test: add deterministic search latency fixtures`; push to `origin/main` performed after the commit. No merge, release, or deployment was required for this fixture/test/documentation unit.
- 2026-07-14: Committed the 1.4 inventory documentation work unit on `main` as `9d774b5` with message `docs: inventory supported extension declarations`, then pushed `main` to `origin` (`44ee5c2..9d774b5`). No merge, release, or deployment was required for this documentation-only inventory unit.
- 2026-07-15: Committed the 1.5 schema/migration implication map on `main` with message `docs: map database migration implications`, then pushed `main` to `origin`. No merge, release, or deployment was required for this documentation-only inventory unit.
- 2026-07-16: Committed the 1.6 producer-to-consumer architecture map on `main` as `fa62a80` with message `docs: map producer consumer architecture`. A follow-up progress evidence commit recorded this git action. Push to `origin/main` was performed after both commits. No merge, release, or deployment was required for this documentation-only architecture unit.
- 2026-07-17: Committed the 2.1 capability registry design on `main` as `25424f3` with message `docs: design file capability registry`, then committed progress evidence as `80de101` with message `docs: record capability registry design progress`. Pushed `main` to `origin` (`b3f0ebd..80de101`). No merge, release, or deployment was required for this documentation-only design unit. Unrelated modified screenshots and Tauri files remained unstaged.
- 2026-07-18: Committed the 2.2 capability registry source/generator/validation work on `main` as `356bde8` with message `feat: add file capability registry validation`, then committed progress evidence as `59da8f2` with message `docs: record capability registry validation progress`. Pushed `main` to `origin` (`90776d1..59da8f2`). No merge, release, or deployment was required for this registry infrastructure unit.
- 2026-07-20: Committed the 2.3 TypeScript consumer migration on `main` as `7b14bbc` with message `feat: migrate TypeScript file capability consumers`, then pushed `main` to `origin` (`332f57b..7b14bbc`). No merge, release, or deployment was required for this TypeScript registry consumer migration.
- 2026-07-21: Committed the 2.4 Rust discovery and watcher consumer migration on `main` as `557b2e5` with message `feat: migrate discovery and watcher capabilities`, then committed progress evidence as `a302caa` with message `docs: record discovery watcher migration progress`. Pushed `main` to `origin` (`52de71f..a302caa`). No merge, release, or deployment was required for this bounded registry consumer migration.
- 2026-07-22: Committed the 2.5 parser routing and diagnostics migration on current branch `feat/document-summaries-byok` as `3791ede` with message `feat: migrate parser diagnostics capabilities`. No merge, release, or deployment was performed because this run followed the current checked-out branch as source of truth and the repository has no deploy action for this bounded registry consumer migration.
- Committed the isolated progress record on `main` with message `docs: record roadmap verification baselines`.
- Pushed the baseline documentation commits to `origin/main` with normal non-force pushes. No merge, release, or deployment was required for this documentation-only baseline unit.
