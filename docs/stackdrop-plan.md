# StackDrop Plan

Version: v2.1.4
Status: Active
Date: 2026-07-10

## Current Decision

The primary upgrade path is incremental indexing first, durable resumability second.

Search quality, diagnostics, watcher coalescing, and Windows release packaging already exist. The highest-impact confirmed gap was repeat scans doing unnecessary work for unchanged healthy files.

## Completed in v2.1.4

- Skip unchanged healthy documents during repeat scans when absolute path, file size, modified timestamp, and successful parse status still match.
- Continue retrying failed documents on later scans.
- Reprocess changed files, including size-only changes when the modified timestamp is unchanged.
- Keep pruning safe: missing-file deletion still runs only after successful discovery and scan finalization.
- Remove stale duplicate planning docs that contradicted shipped `.doc`, OCR, watcher, search, and parse-status behavior.

## Backlog

1. Add parser/index version fingerprints so parser or FTS changes can force targeted reindexing.
2. Add durable per-file scan state and generation IDs so interrupted scans resume from exact work items.
3. Add watcher-targeted updates while keeping periodic full reconciliation.
4. Build a realistic search benchmark with labeled filename, path, body, partial-term, OCR-noisy, and multi-word queries.
5. Add PR CI, packaged Windows smoke automation, updater readiness, CSP hardening, and signing readiness.

## Verification

- Narrow regression: `npx vitest run src/tests/integration/folderScan.v1.test.ts --testNamePattern "skips unchanged|reprocesses a file once|prioritizes unindexed"`
- Release verification should still run `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:e2e`, and `cd src-tauri && cargo test`.
