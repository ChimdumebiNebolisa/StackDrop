import type { DocumentQueryFilters, IndexedDocumentRecord } from "../../../domain/documents/types";
import type { SqlClient } from "../../../data/db/sqliteClient";
import { DocumentRepository } from "../../../data/repositories/documentRepository";
import { DocumentSearchRepository } from "../../../data/search/documentSearchRepository";

export async function queryDocuments(
  client: SqlClient,
  searchText: string,
  filters: DocumentQueryFilters,
): Promise<IndexedDocumentRecord[]> {
  const trimmed = searchText.trim();
  if (trimmed.length === 0) {
    return new DocumentRepository(client).listDocuments(filters);
  }
  return new DocumentSearchRepository(client).searchDocuments(trimmed, filters);
}
