import type { IndexedFolderRecord } from "../../domain/documents/types";
import type { SqlClient } from "../db/sqliteClient";

interface FolderRow {
  id: string;
  root_path: string;
  created_at: string;
  last_scan_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
}

function mapRow(row: FolderRow): IndexedFolderRecord {
  return {
    id: row.id,
    rootPath: row.root_path,
    createdAt: row.created_at,
    lastScanAt: row.last_scan_at,
    lastError: row.last_error,
    lastErrorAt: row.last_error_at,
  };
}

export class FolderRepository {
  constructor(private readonly client: SqlClient) {}

  async insertFolder(input: { id: string; rootPath: string; createdAt: string }): Promise<void> {
    await this.client.execute(
      `INSERT INTO indexed_folders (id, root_path, created_at, last_scan_at) VALUES (?, ?, ?, NULL)`,
      [input.id, input.rootPath, input.createdAt],
    );
  }

  async deleteFolder(id: string): Promise<void> {
    await this.client.execute("DELETE FROM indexed_folders WHERE id = ?", [id]);
  }

  async listFolders(): Promise<IndexedFolderRecord[]> {
    const rows = await this.client.select<FolderRow>(
      "SELECT * FROM indexed_folders ORDER BY created_at ASC",
    );
    return rows.map(mapRow);
  }

  async getFolder(id: string): Promise<IndexedFolderRecord | null> {
    const row = await this.client.get<FolderRow>("SELECT * FROM indexed_folders WHERE id = ?", [id]);
    return row ? mapRow(row) : null;
  }

  async updateLastScan(id: string, lastScanAt: string): Promise<void> {
    await this.client.execute(
      "UPDATE indexed_folders SET last_scan_at = ?, last_error = NULL, last_error_at = NULL WHERE id = ?",
      [lastScanAt, id],
    );
  }

  async updateScanError(id: string, message: string, occurredAt: string): Promise<void> {
    await this.client.execute(
      "UPDATE indexed_folders SET last_error = ?, last_error_at = ? WHERE id = ?",
      [message, occurredAt, id],
    );
  }
}
