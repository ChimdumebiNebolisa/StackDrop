import type { SqlClient } from "../../../data/db/sqliteClient";
import { DocumentRepository } from "../../../data/repositories/documentRepository";
import type { IndexedDocumentRecord } from "../../../domain/documents/types";

export async function getDocumentDetail(documentId: string, client: SqlClient): Promise<IndexedDocumentRecord | null> {
  return new DocumentRepository(client).getDocument(documentId);
}
