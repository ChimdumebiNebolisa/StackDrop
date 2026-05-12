import type { SqlClient } from "../db/sqliteClient";

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tag_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class TagRepository {
  constructor(private readonly client: SqlClient) {}

  async upsertTags(itemId: string, tags: string[]): Promise<void> {
    await this.client.execute("DELETE FROM item_tags WHERE item_id = ?", [itemId]);
    for (const tagName of tags) {
      const cleanedTagName = tagName.trim();
      if (!cleanedTagName) continue;

      let tag = await this.client.get<{ id: string }>("SELECT id FROM tags WHERE name = ?", [
        cleanedTagName,
      ]);
      if (!tag) {
        const id = createId();
        await this.client.execute("INSERT INTO tags (id, name) VALUES (?, ?)", [id, cleanedTagName]);
        tag = { id };
      }
      await this.client.execute("INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)", [
        itemId,
        tag.id,
      ]);
    }
  }

  async listTags(): Promise<string[]> {
    const rows = await this.client.select<{ name: string }>(
      "SELECT name FROM tags ORDER BY name ASC",
    );
    return rows.map((row) => row.name);
  }
}
