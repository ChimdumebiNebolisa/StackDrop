# StackDrop search accuracy baseline

Date recorded: 2026-07-12

This document records the current lexical search behavior before later roadmap work changes ranking, filters, or explainability. It is evidence of the shipped baseline, not a target-state design.

## Search pipeline

1. `queryDocuments(client, searchText, filters)` trims the search text.
2. Empty search text bypasses FTS and lists documents through `DocumentRepository.listDocuments(filters)`.
3. Non-empty search text forces `sort: "relevance"` before calling `DocumentSearchRepository.searchDocuments`.
4. `toFtsQuery` splits the input on characters that are not Unicode letters, numbers, or underscores.
5. Each token is quoted and joined with spaces, so multi-term FTS searches require all terms to match.
6. FTS searches match `file_name`, `relative_path`, and `body`.
7. Relevance ordering applies:
   - case-insensitive exact filename boost first
   - `bm25(document_search, 10.0, 5.0, 1.0)` next
   - `updated_at DESC` as the final tiebreaker
8. If the exact-token FTS query returns no rows, a prefix query is tried.
9. If FTS and prefix matching return no rows, a filename/path `LIKE '%query%'` fallback runs.
10. If FTS throws, the filename/path fallback runs.

## Current verified behavior

| Behavior | Current result | Automated coverage |
|---|---|---|
| Empty query | Lists indexed documents, normally sorted by recent index time. | `searchAccuracy.test.ts` empty-search sorting |
| Punctuation-only query | Returns no matches instead of the full library. | `searchAccuracy.test.ts` unsafe input |
| Quote-only query | Does not crash. | `searchAccuracy.test.ts` unsafe input |
| Single-character query | Does not crash; no prefix expansion is applied. | `searchAccuracy.test.ts` unsafe input |
| Single-token FTS query | Searches exact token first. | `searchAccuracy.test.ts` query builder |
| Multi-token query | Requires all normalized terms to match. | `searchAccuracy.test.ts` multi-word search |
| Prefix query | Only runs after exact-token FTS returns zero rows. | `searchAccuracy.test.ts` prefix matching |
| Filename-vs-body ranking | Filename matches rank above body-only matches under the current fixture. | `searchAccuracy.test.ts` ranking |
| Exact filename ranking | Exact filename match ranks first, case-insensitively. | `searchAccuracy.test.ts` ranking |
| Relative path search | Path segments are searchable through FTS. | `searchAccuracy.test.ts`; `folderScan.v1.test.ts` |
| Filename/path substring fallback | Finds filename or path substrings when FTS has no matches. | `searchAccuracy.test.ts` filename/path fallback |
| Folder filter with search | Filters apply to FTS and filename/path fallback paths. | `searchAccuracy.test.ts` filters with search |
| Body snippets | FTS body matches can return `<mark>` highlighted snippets. | `searchAccuracy.test.ts`; Playwright web shell |
| Fallback snippets | Filename/path fallback results have `searchSnippet: null`. | `searchAccuracy.test.ts` filename/path fallback |

## Known limitations and gaps

- Exact-token and prefix candidates are not combined; prefix search is only used after exact-token FTS returns zero rows.
- The documented final ranking contract is not yet fully implemented. Filename stem, filename prefix, filename token, relative-path ranking tiers, OR fallback, and typo tolerance are later Phase 5 work.
- There is no exact phrase search. Quoted input is tokenized into words.
- Filename/path substring fallback is lower fidelity than FTS ranking and sorts by `updated_at DESC`.
- Non-ASCII case behavior depends on SQLite FTS/tokenizer behavior and has not been separately verified.
- Snippets are body-oriented. Filename/path-only hits normally have no snippet.
- Search result pagination and hard result limits are not yet part of this baseline.
- Search match explainability is implicit in ordering/snippets; the UI does not yet label filename, path, or body match source.

## Verification command

```bash
npm run test -- src/tests/unit/searchAccuracy.test.ts
```

Recorded result on 2026-07-12: exit 0; 1 test file passed; 22 tests passed.
