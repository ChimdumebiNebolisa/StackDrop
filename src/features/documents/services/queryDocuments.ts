import type { DocumentQueryFilters, SearchResultRecord } from "../../../domain/documents/types";
import type { SqlClient } from "../../../data/db/sqliteClient";
import { DocumentRepository } from "../../../data/repositories/documentRepository";
import { DocumentSearchRepository } from "../../../data/search/documentSearchRepository";

export async function queryDocuments(
  client: SqlClient,
  searchText: string,
  filters: DocumentQueryFilters,
): Promise<SearchResultRecord[]> {
  const trimmed = searchText.trim();
  if (trimmed.length === 0) {
    const docs = await new DocumentRepository(client).listDocuments(filters);
    return docs.map((d) => ({ ...d, searchSnippet: null }));
  }
  const searchFilters: DocumentQueryFilters = { ...filters, sort: "relevance" };
  return new DocumentSearchRepository(client).searchDocuments(trimmed, searchFilters);
}
