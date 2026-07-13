# Search latency fixtures

Status: Phase 1 baseline fixture definition.

StackDrop uses deterministic in-memory SQLite fixtures for search-latency work until Phase 6 adds larger generated scale corpora. The fixture code lives in [`src/tests/fixtures/searchLatencyFixtures.ts`](../src/tests/fixtures/searchLatencyFixtures.ts), and the verification test lives in [`src/tests/unit/searchLatencyFixtures.test.ts`](../src/tests/unit/searchLatencyFixtures.test.ts).

## Fixture shape

The representative corpus is generated, not committed as a database. By default it contains 240 ordinary `.txt` rows plus targeted documents for the current search paths:

| Query path | Fixture query | Expected coverage |
|------------|---------------|-------------------|
| Exact filename | `latency-target-report.txt` | Exact filename boost through FTS relevance ordering |
| Filename prefix | `latency-pref` | Prefix query path after exact-token FTS returns no rows |
| Relative path | `acme quarterly` | Multi-term path search through the FTS `relative_path` column |
| Body-only | `rare-body-latency-token` | Body FTS search and highlighted snippets |
| Filename/path fallback | `voice2026` | SQL `LIKE` fallback after FTS has no match |

The generated documents use stable IDs, paths, body text, sizes, and timestamps. This makes later latency measurements comparable across runs without depending on wall-clock data, filesystem traversal order, random UUIDs, or checked-in benchmark output.

## Current verification

Run the focused fixture check with:

```bash
npm run test -- src/tests/unit/searchLatencyFixtures.test.ts
```

This verifies that the generated corpus is deterministic and that the fixture still exercises the production search service path:

```text
queryDocuments -> DocumentSearchRepository -> SQLite FTS5 / fallback SQL
```

## Scope limits

This Phase 1 fixture is not a performance benchmark and does not set latency thresholds. It is a stable representative input for future Phase 6 measurement work. Larger 10,000-document and 100,000-document generated corpora remain deferred to the ordered performance phase and should not be committed as generated databases.
