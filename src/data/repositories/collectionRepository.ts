import type { SqlClient } from "../db/sqliteClient";

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `collection_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class CollectionRepository {
  constructor(private readonly client: SqlClient) {}

  async createCollection(name: string): Promise<string> {
    const id = createId();
    await this.client.execute("INSERT INTO collections (id, name) VALUES (?, ?)", [id, name]);
    return id;
  }

  async listCollections(): Promise<{ id: string; name: string }[]> {
    return this.client.select<{ id: string; name: string }>(
      "SELECT id, name FROM collections ORDER BY name ASC",
    );
  }

  async setCollection(itemId: string, collectionId: string): Promise<void> {
    await this.client.execute("UPDATE items SET collection_id = ? WHERE id = ?", [
      collectionId,
      itemId,
    ]);
  }

  async clearCollection(itemId: string): Promise<void> {
    await this.client.execute("UPDATE items SET collection_id = NULL WHERE id = ?", [itemId]);
  }
}
