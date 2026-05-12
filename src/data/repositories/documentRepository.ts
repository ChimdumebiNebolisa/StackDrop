import type { DocumentQueryFilters, FileExtension, IndexedDocumentRecord, ParseStatus } from "../../domain/documents/types";
import type { SqlClient } from "../db/sqliteClient";

interface DocumentRow {
  id: string;
  folder_id: string;
  absolute_path: string;
  relative_path: string;
  file_name: string;
  file_extension: FileExtension;
  size_bytes: number;
  modified_at: string;
  parse_status: ParseStatus;
  parse_error: string | null;
  extracted_text: string | null;
  updated_at: string;
}

function mapRow(row: DocumentRow): IndexedDocumentRecord {
  return {
    id: row.id,
    folderId: row.folder_id,
    absolutePath: row.absolute_path,
    relativePath: row.relative_path,
    fileName: row.file_name,
    fileExtension: row.file_extension,
    sizeBytes: row.size_bytes,
    modifiedAt: row.modified_at,
    parseStatus: row.parse_status,
    parseError: row.parse_error,
    extractedText: row.extracted_text,
    updatedAt: row.updated_at,
  };
}

export interface DocumentUpsertInput {
  id: string;
  folderId: string;
  absolutePath: string;
  relativePath: string;
  fileName: string;
  fileExtension: FileExtension;
  sizeBytes: number;
  modifiedAt: string;
  parseStatus: ParseStatus;
  parseError: string | null;
  extractedText: string | null;
  updatedAt: string;
}

export class DocumentRepository {
  constructor(private readonly client: SqlClient) {}

  async upsertDocument(input: DocumentUpsertInput): Promise<void> {
    await this.client.execute(
      `INSERT INTO indexed_documents (
        id, folder_id, absolute_path, relative_path, file_name, file_extension,
        size_bytes, modified_at, parse_status, parse_error, extracted_text, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(absolute_path) DO UPDATE SET
        folder_id = excluded.folder_id,
        relative_path = excluded.relative_path,
        file_name = excluded.file_name,
        file_extension = excluded.file_extension,
        size_bytes = excluded.size_bytes,
        modified_at = excluded.modified_at,
        parse_status = excluded.parse_status,
        parse_error = excluded.parse_error,
        extracted_text = excluded.extracted_text,
        updated_at = excluded.updated_at`,
      [
        input.id,
        input.folderId,
        input.absolutePath,
        input.relativePath,
        input.fileName,
        input.fileExtension,
        input.sizeBytes,
        input.modifiedAt,
        input.parseStatus,
        input.parseError,
        input.extractedText,
        input.updatedAt,
      ],
    );
  }

  async findIdByAbsolutePath(absolutePath: string): Promise<string | null> {
    const row = await this.client.get<{ id: string }>(
      "SELECT id FROM indexed_documents WHERE absolute_path = ?",
      [absolutePath],
    );
    return row?.id ?? null;
  }

  async listDocuments(filters: DocumentQueryFilters = {}): Promise<IndexedDocumentRecord[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters.folderId) {
      clauses.push("folder_id = ?");
      params.push(filters.folderId);
    }
    if (filters.extension) {
      clauses.push("file_extension = ?");
      params.push(filters.extension);
    }
    if (filters.parseStatus) {
      clauses.push("parse_status = ?");
      params.push(filters.parseStatus);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const orderBy = filters.sort === "recent" ? "updated_at DESC" : "file_name ASC";
    const rows = await this.client.select<DocumentRow>(
      `SELECT * FROM indexed_documents ${where} ORDER BY ${orderBy}`,
      params,
    );
    return rows.map(mapRow);
  }

  async getDocument(id: string): Promise<IndexedDocumentRecord | null> {
    const row = await this.client.get<DocumentRow>("SELECT * FROM indexed_documents WHERE id = ?", [id]);
    return row ? mapRow(row) : null;
  }

  async deleteDocumentsNotInPaths(folderId: string, keepPaths: Set<string>): Promise<void> {
    const rows = await this.client.select<{ id: string; absolute_path: string }>(
      "SELECT id, absolute_path FROM indexed_documents WHERE folder_id = ?",
      [folderId],
    );
    for (const row of rows) {
      if (!keepPaths.has(row.absolute_path)) {
        await this.client.execute("DELETE FROM document_search WHERE document_id = ?", [row.id]);
        await this.client.execute("DELETE FROM indexed_documents WHERE id = ?", [row.id]);
      }
    }
  }
}
