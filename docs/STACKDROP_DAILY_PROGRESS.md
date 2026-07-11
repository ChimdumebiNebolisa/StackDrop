# StackDrop Daily Roadmap Progress

Last updated: 2026-07-11
Current roadmap phase: Phase 1 - Baselines and system inventory
Current in-progress work unit: None; next is 1.2 Record current search accuracy behavior

## Ordered work-unit checklist

### Phase 1 - Baselines and system inventory

- [x] 1.1 Establish TypeScript, frontend, Rust, build, formatting, lint, unit, E2E, and packaging baselines.
- [ ] 1.2 Record current search accuracy behavior.
- [ ] 1.3 Add or document representative deterministic latency fixtures.
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

## Current work-unit blast radius

Completed work unit 1.1 was evidence-only. It ran existing verification commands and recorded their current results. It did not change producers, consumers, schemas, migrations, parsers, query behavior, UI behavior, packaging configuration, or runtime documentation. The only intentional repository change is this progress record. Existing modified proof screenshots are user-owned and excluded from this work; Playwright's existing proof test writes those same paths, so their contents remain outside this run's staging scope.

## Deferred items

- All later roadmap units remain deferred until their prerequisites are complete.
- Strict Clippy cleanup is deferred to its ordered Phase 7 formatting/clippy work unit; the findings do not block the passing documented build or test commands.

## Blockers

None. Baseline failures are recorded below rather than treated as blockers.

## Commands executed

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

- Passing: TypeScript typecheck; 66 Vitest unit/integration tests; frontend production build; 9 Playwright E2E tests; 16 Rust tests; Rust formatting; Windows application and MSI/NSIS packaging.
- Failing baseline: strict Clippy, exit 101, with four existing warnings promoted to errors.
- Unavailable baseline: JavaScript/TypeScript lint, because no lint command/configuration exists.

## Important architectural decisions

- Preserve the local-only Tauri + React + SQLite/FTS5 architecture.
- Treat the four modified `docs/proof-screenshots/*.png` files as unrelated user work.
- Do not fix baseline findings inside an evidence-only work unit; retain them as evidence for their ordered roadmap work.

## Files or systems affected

- `docs/STACKDROP_DAILY_PROGRESS.md` only as an intentional source change.
- Local ignored build outputs under `dist/` and `src-tauri/target/` were produced by verification.

## Known platform-specific behavior that remains unverified

- Windows x64 packaging was verified locally and produced both MSI and NSIS installers.
- Linux and macOS builds/packages were not verified in this Windows environment.
- Installer execution/smoke behavior was not tested; this unit established package generation only.

## Git, merge, release, or deployment actions

- Committed the isolated progress record on `main` with message `docs: record roadmap verification baselines`.
- Pushed the baseline documentation commits to `origin/main` with normal non-force pushes. No merge, release, or deployment was required for this documentation-only baseline unit.
