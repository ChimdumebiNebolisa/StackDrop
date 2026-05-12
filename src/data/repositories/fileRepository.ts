import type { SqlClient } from "../db/sqliteClient";

export class FileRepository {
  constructor(private readonly client: SqlClient) {}

  async upsertFile(
    itemId: string,
    filePath: string,
    fileExtension: string,
    extractedText: string | null,
  ): Promise<void> {
    await this.client.execute(
      `INSERT INTO file_metadata (item_id, file_path, file_extension, extracted_text) VALUES (?, ?, ?, ?)
       ON CONFLICT(item_id) DO UPDATE SET file_path = excluded.file_path, file_extension = excluded.file_extension, extracted_text = excluded.extracted_text`,
      [itemId, filePath, fileExtension, extractedText],
    );
  }

  async getFile(itemId: string): Promise<{
    itemId: string;
    filePath: string;
    fileExtension: string;
    extractedText: string | null;
  } | null> {
    const row = await this.client.get<{
      item_id: string;
      file_path: string;
      file_extension: string;
      extracted_text: string | null;
    }>("SELECT item_id, file_path, file_extension, extracted_text FROM file_metadata WHERE item_id = ?", [itemId]);
    if (!row) return null;
    return {
      itemId: row.item_id,
      filePath: row.file_path,
      fileExtension: row.file_extension,
      extractedText: row.extracted_text,
    };
  }
}
