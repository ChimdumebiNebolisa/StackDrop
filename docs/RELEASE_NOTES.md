# StackDrop v2.1.4 Release Notes

## Highlights

- Repeat indexing is faster for unchanged libraries. StackDrop now skips files that are already successfully indexed when their path, size, and modified timestamp have not changed.
- Unchanged healthy files are not read, parsed, OCRed, upserted, or rewritten in FTS during a second no-change scan.
- Changed files are still reprocessed, including size-only changes when a filesystem reports the same modified timestamp.
- Failed files still retry on later scans, so transient read/parser failures can recover.
- Stale planning docs were removed and the active docs now describe current indexing, search, diagnostics, and release behavior.

## Verification

- `npx vitest run src/tests/integration/folderScan.v1.test.ts --testNamePattern "skips unchanged|reprocesses a file once|prioritizes unindexed"`

## Known Limitations

- StackDrop still does filesystem discovery on repeat scans.
- Partial scans preserve completed work but do not yet resume from an exact durable per-file queue.
- Windows installers remain unsigned, so SmartScreen may warn users.
