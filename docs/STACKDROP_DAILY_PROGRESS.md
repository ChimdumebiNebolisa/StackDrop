# StackDrop Daily Roadmap Progress

Last updated: 2026-07-13
Current roadmap phase: Phase 1 - Baselines and system inventory
Current in-progress work unit: None; next is 1.4 Inventory every supported-extension declaration or assumption

## Ordered work-unit checklist

### Phase 1 - Baselines and system inventory

- [x] 1.1 Establish TypeScript, frontend, Rust, build, formatting, lint, unit, E2E, and packaging baselines.
- [x] 1.2 Record current search accuracy behavior.
- [x] 1.3 Add or document representative deterministic latency fixtures.
- [ ] 1.4 Inventory every supported-extension declaration or assumption.
- [ ] 1.5 Map database schema and migration implications for ranking, metadata, and file-type expansion.
- [ ] 1.6 Create the initial producer-to-consumer architecture and blast-radius map.

### Phase 2 - Canonical file-type capability registry

- [ ] 2.1 Design the registry and generation boundary.
- [ ] 2.2 Add canonical source data and cross-language validation.
- [ ] 2.3 Migrate TypeScript consumers.
- [ ] 2.4 Migrate Rust discovery and watcher consumers.
- [ ] 2.5 Migrate parser routing and diagnostics.
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

## Current work-unit blast radius

Completed work unit 1.3 is limited to representative deterministic search-latency fixture definitions, fixture documentation, focused tests, and this progress record. It traces the existing `queryDocuments` -> `DocumentSearchRepository` -> SQLite FTS/fallback path using generated in-memory rows. It does not change runtime search ranking, discovery, watcher behavior, parsers, UI, schemas, migrations, packaging, generated files, or the user-owned modified proof screenshots/Tauri files already present in the worktree.

## Deferred items

- All later roadmap units remain deferred until their prerequisites are complete.
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

## Verification results

- 2026-07-12: Passing targeted search baseline verification: 22 Vitest tests in `src/tests/unit/searchAccuracy.test.ts`.
- 2026-07-12: Passing diff hygiene: `git diff --check`.
- 2026-07-13: Passing focused fixture verification: 2 Vitest tests in `src/tests/unit/searchLatencyFixtures.test.ts`.
- 2026-07-13: Passing adjacent search verification: 22 Vitest tests in `src/tests/unit/searchAccuracy.test.ts`.
- 2026-07-13: Passing TypeScript typecheck.
- Passing: TypeScript typecheck; 66 Vitest unit/integration tests; frontend production build; 9 Playwright E2E tests; 16 Rust tests; Rust formatting; Windows application and MSI/NSIS packaging.
- Failing baseline: strict Clippy, exit 101, with four existing warnings promoted to errors.
- Unavailable baseline: JavaScript/TypeScript lint, because no lint command/configuration exists.

## Important architectural decisions

- Preserve the local-only Tauri + React + SQLite/FTS5 architecture.
- Treat the modified `docs/proof-screenshots/*.png`, `src-tauri/Cargo.toml`, and generated Tauri schema files as unrelated user work.
- Do not fix baseline findings inside an evidence-only work unit; retain them as evidence for their ordered roadmap work.
- Treat 1.2 as a recorded baseline rather than a search behavior change. Later Phase 5 units must update the baseline/contract when ranking semantics change.
- Treat 1.3 as a deterministic fixture definition rather than a benchmark. Do not add latency thresholds until Phase 6 measurement work defines corpus size, environment controls, and acceptable limits.

## Files or systems affected

- `docs/SEARCH_ACCURACY_BASELINE.md` added as the recorded current search behavior.
- `docs/SEARCH_LATENCY_FIXTURES.md` added as the representative deterministic search-latency fixture description.
- `src/tests/fixtures/searchLatencyFixtures.ts` added as generated in-memory fixture data for search-latency work.
- `src/tests/unit/searchLatencyFixtures.test.ts` added to verify fixture determinism and coverage of current search paths.
- `docs/STACKDROP_DAILY_PROGRESS.md` updated with 1.2 evidence and next work unit.
- Local ignored build outputs under `dist/` and `src-tauri/target/` were produced by verification.

## Known platform-specific behavior that remains unverified

- Windows x64 packaging was verified locally and produced both MSI and NSIS installers.
- Linux and macOS builds/packages were not verified in this Windows environment.
- Installer execution/smoke behavior was not tested; this unit established package generation only.
- No actual latency measurements were taken in 1.3; future Phase 6 work must measure timing under documented environment conditions.

## Git, merge, release, or deployment actions

- 2026-07-12: Committed the documentation-only 1.2 work unit on `main` as `09d8fae` with message `docs: record search accuracy baseline`, then pushed `main` to `origin` (`6e88824..09d8fae`). No merge, release, or deployment was required.
- 2026-07-13: Committed the 1.3 fixture/test/documentation work unit on `main` with message `test: add deterministic search latency fixtures`; push to `origin/main` performed after the commit. No merge, release, or deployment was required for this fixture/test/documentation unit.
- Committed the isolated progress record on `main` with message `docs: record roadmap verification baselines`.
- Pushed the baseline documentation commits to `origin/main` with normal non-force pushes. No merge, release, or deployment was required for this documentation-only baseline unit.
