import type { DocumentQueryFilters, IndexedDocumentRecord } from "../../domain/documents/types";
import type { SqlClient } from "../db/sqliteClient";
import { DocumentRepository } from "../repositories/documentRepository";

interface SearchRow {
  id: string;
  folder_id: string;
  absolute_path: string;
  relative_path: string;
  file_name: string;
  file_extension: string;
  size_bytes: number;
  modified_at: string;
  parse_status: string;
  parse_error: string | null;
  extracted_text: string | null;
  updated_at: string;
}

function toFtsQuery(input: string): string {
  const terms = input
    .split(/[^\p{L}\p{N}_]+/u)
    .map((term) => term.trim())
    .filter(Boolean);
  return terms.map((term) => `"${term.replaceAll('"', '""')}"`).join(" ");
}

function mapSearchRow(row: SearchRow): IndexedDocumentRecord {
  return {
    id: row.id,
    folderId: row.folder_id,
    absolutePath: row.absolute_path,
    relativePath: row.relative_path,
    fileName: row.file_name,
    fileExtension: row.file_extension as IndexedDocumentRecord["fileExtension"],
    sizeBytes: row.size_bytes,
    modifiedAt: row.modified_at,
    parseStatus: row.parse_status as IndexedDocumentRecord["parseStatus"],
    parseError: row.parse_error,
    extractedText: row.extracted_text,
    updatedAt: row.updated_at,
  };
}

export class DocumentSearchRepository {
  constructor(private readonly client: SqlClient) {}

  async indexDocument(documentId: string, fileName: string, body: string): Promise<void> {
    await this.client.execute("DELETE FROM document_search WHERE document_id = ?", [documentId]);
    await this.client.execute(
      "INSERT INTO document_search (document_id, file_name, body) VALUES (?, ?, ?)",
      [documentId, fileName, body],
    );
  }

  async removeDocument(documentId: string): Promise<void> {
    await this.client.execute("DELETE FROM document_search WHERE document_id = ?", [documentId]);
  }

  async searchDocuments(query: string, filters: DocumentQueryFilters = {}): Promise<IndexedDocumentRecord[]> {
    const ftsQuery = toFtsQuery(query);
    if (!ftsQuery) {
      return new DocumentRepository(this.client).listDocuments(filters);
    }

    const extraClauses: string[] = [];
    const params: unknown[] = [ftsQuery];
    if (filters.folderId) {
      extraClauses.push("d.folder_id = ?");
      params.push(filters.folderId);
    }
    if (filters.extension) {
      extraClauses.push("d.file_extension = ?");
      params.push(filters.extension);
    }
    if (filters.parseStatus) {
      extraClauses.push("d.parse_status = ?");
      params.push(filters.parseStatus);
    }
    const orderBy =
      filters.sort === "recent" ? "d.updated_at DESC" : "bm25(document_search), d.updated_at DESC";
    const extraSql = extraClauses.length > 0 ? ` AND ${extraClauses.join(" AND ")}` : "";
    const rows = await this.client.select<SearchRow>(
      `SELECT d.*
       FROM document_search s
       JOIN indexed_documents d ON s.document_id = d.id
       WHERE document_search MATCH ?${extraSql}
       ORDER BY ${orderBy}`,
      params,
    );
    return rows.map(mapSearchRow);
  }
}
