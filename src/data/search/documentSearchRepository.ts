import type { DocumentQueryFilters, IndexedDocumentRecord, SearchResultRecord } from "../../domain/documents/types";
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
  search_snippet?: string | null;
}

export function toFtsQuery(input: string): string {
  const terms = input
    .split(/[^\p{L}\p{N}_]+/u)
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length === 0) return "";

  const quoted = terms.map((t) => `"${t.replaceAll('"', '""')}"`);
  return quoted.join(" ");
}

export function toFtsQueryWithPrefix(input: string): string {
  const terms = input
    .split(/[^\p{L}\p{N}_]+/u)
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length === 0) return "";

  if (terms.length === 1) {
    const t = terms[0].replaceAll('"', '""');
    return t.length >= 2 ? `${t}*` : `"${t}"`;
  }

  const quoted = terms.slice(0, -1).map((t) => `"${t.replaceAll('"', '""')}"`);
  const last = terms[terms.length - 1].replaceAll('"', '""');
  const lastExpr = last.length >= 2 ? `${last}*` : `"${last}"`;
  return [...quoted, lastExpr].join(" ");
}

function mapSearchRow(row: SearchRow): SearchResultRecord {
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
    searchSnippet: row.search_snippet ?? null,
  };
}

export class DocumentSearchRepository {
  constructor(private readonly client: SqlClient) {}

  async indexDocument(documentId: string, fileName: string, relativePath: string, body: string): Promise<void> {
    await this.client.execute("DELETE FROM document_search WHERE document_id = ?", [documentId]);
    await this.client.execute(
      "INSERT INTO document_search (document_id, file_name, relative_path, body) VALUES (?, ?, ?, ?)",
      [documentId, fileName, relativePath, body],
    );
  }

  async removeDocument(documentId: string): Promise<void> {
    await this.client.execute("DELETE FROM document_search WHERE document_id = ?", [documentId]);
  }

  async searchDocuments(query: string, filters: DocumentQueryFilters = {}): Promise<SearchResultRecord[]> {
    const ftsQuery = toFtsQuery(query);
    if (!ftsQuery) {
      const docs = await new DocumentRepository(this.client).listDocuments(filters);
      return docs.map((d) => ({ ...d, searchSnippet: null }));
    }

    const extraClauses: string[] = [];
    const filterParams: unknown[] = [];
    if (filters.folderId) {
      extraClauses.push("d.folder_id = ?");
      filterParams.push(filters.folderId);
    }
    if (filters.extension) {
      extraClauses.push("d.file_extension = ?");
      filterParams.push(filters.extension);
    }
    if (filters.parseStatus) {
      extraClauses.push("d.parse_status = ?");
      filterParams.push(filters.parseStatus);
    }
    const extraSql = extraClauses.length > 0 ? ` AND ${extraClauses.join(" AND ")}` : "";

    const runFtsQuery = async (matchExpr: string, sort: "recent" | "relevance"): Promise<SearchResultRecord[]> => {
      const trimmedQuery = query.trim();
      if (sort === "recent") {
        const params: unknown[] = [matchExpr, ...filterParams];
        const rows = await this.client.select<SearchRow>(
          `SELECT d.*, snippet(document_search, 3, '<mark>', '</mark>', '…', 32) AS search_snippet
           FROM document_search s
           JOIN indexed_documents d ON s.document_id = d.id
           WHERE document_search MATCH ?${extraSql}
           ORDER BY d.updated_at DESC`,
          params,
        );
        return rows.map(mapSearchRow);
      }

      const params: unknown[] = [matchExpr, ...filterParams, trimmedQuery];
      const rows = await this.client.select<SearchRow>(
        `SELECT d.*, snippet(document_search, 3, '<mark>', '</mark>', '…', 32) AS search_snippet
         FROM document_search s
         JOIN indexed_documents d ON s.document_id = d.id
         WHERE document_search MATCH ?${extraSql}
         ORDER BY
           CASE WHEN d.file_name = ? THEN 0 ELSE 1 END,
           bm25(document_search, 10.0, 5.0, 1.0),
           d.updated_at DESC`,
        params,
      );
      return rows.map(mapSearchRow);
    };

    const sort = filters.sort ?? "relevance";

    try {
      let results = await runFtsQuery(ftsQuery, sort);
      if (results.length === 0) {
        const prefixQuery = toFtsQueryWithPrefix(query);
        if (prefixQuery && prefixQuery !== ftsQuery) {
          results = await runFtsQuery(prefixQuery, sort);
        }
      }
      return results;
    } catch {
      const trimmedQuery = query.trim();
      const likeParam = `%${trimmedQuery}%`;
      const fallbackParams: unknown[] = [likeParam, likeParam, ...filterParams];
      const rows = await this.client.select<SearchRow>(
        `SELECT d.*, NULL AS search_snippet
         FROM indexed_documents d
         WHERE (d.file_name LIKE ? OR d.relative_path LIKE ?)${extraSql}
         ORDER BY d.updated_at DESC`,
        fallbackParams,
      );
      return rows.map(mapSearchRow);
    }
  }
}
