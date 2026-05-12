import type { SqlClient } from "../db/sqliteClient";

export class NoteRepository {
  constructor(private readonly client: SqlClient) {}

  async upsertNote(itemId: string, body: string): Promise<void> {
    await this.client.execute(
      `INSERT INTO note_contents (item_id, body) VALUES (?, ?)
       ON CONFLICT(item_id) DO UPDATE SET body = excluded.body`,
      [itemId, body],
    );
  }

  async getNote(itemId: string): Promise<{ itemId: string; body: string } | null> {
    const row = await this.client.get<{ item_id: string; body: string }>(
      "SELECT item_id, body FROM note_contents WHERE item_id = ?",
      [itemId],
    );
    if (!row) return null;
    return { itemId: row.item_id, body: row.body };
  }
}
