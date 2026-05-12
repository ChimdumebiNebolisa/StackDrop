import type { SqlClient } from "../db/sqliteClient";

export class LinkRepository {
  constructor(private readonly client: SqlClient) {}

  async upsertLink(itemId: string, url: string): Promise<void> {
    await this.client.execute(
      `INSERT INTO link_metadata (item_id, url) VALUES (?, ?)
       ON CONFLICT(item_id) DO UPDATE SET url = excluded.url`,
      [itemId, url],
    );
  }

  async getLink(itemId: string): Promise<{ itemId: string; url: string } | null> {
    const row = await this.client.get<{ item_id: string; url: string }>(
      "SELECT item_id, url FROM link_metadata WHERE item_id = ?",
      [itemId],
    );
    if (!row) return null;
    return { itemId: row.item_id, url: row.url };
  }
}
