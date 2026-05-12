import type { ItemInsertInput, ItemQueryFilters, ItemRecord } from "../../domain/items/types";
import { mapItemRowToRecord } from "../mappers/itemMapper";
import type { SqlClient } from "../db/sqliteClient";

interface ItemRow {
  id: string;
  type: ItemRecord["type"];
  title: string;
  source_path: string | null;
  source_url: string | null;
  preview_text: string | null;
  is_indexed: number;
  parse_status: ItemRecord["parseStatus"];
  created_at: string;
  updated_at: string;
  collection_id: string | null;
}

export class ItemRepository {
  constructor(private readonly client: SqlClient) {}

  async insertItem(input: ItemInsertInput): Promise<void> {
    await this.client.execute(
      `INSERT INTO items (id, type, title, source_path, source_url, preview_text, is_indexed, parse_status, created_at, updated_at, collection_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.type,
        input.title,
        input.sourcePath ?? null,
        input.sourceUrl ?? null,
        input.previewText ?? null,
        input.isIndexed ? 1 : 0,
        input.parseStatus,
        input.createdAt,
        input.updatedAt,
        input.collectionId ?? null,
      ],
    );
  }

  async updateItem(input: ItemInsertInput): Promise<void> {
    await this.client.execute(
      `UPDATE items
       SET type = ?, title = ?, source_path = ?, source_url = ?, preview_text = ?, is_indexed = ?, parse_status = ?, updated_at = ?, collection_id = ?
       WHERE id = ?`,
      [
        input.type,
        input.title,
        input.sourcePath ?? null,
        input.sourceUrl ?? null,
        input.previewText ?? null,
        input.isIndexed ? 1 : 0,
        input.parseStatus,
        input.updatedAt,
        input.collectionId ?? null,
        input.id,
      ],
    );
  }

  async deleteItem(id: string): Promise<void> {
    await this.client.execute("DELETE FROM item_search WHERE item_id = ?", [id]);
    await this.client.execute("DELETE FROM items WHERE id = ?", [id]);
  }

  async fetchItem(id: string): Promise<ItemRecord | null> {
    const row = await this.client.get<ItemRow>("SELECT * FROM items WHERE id = ?", [id]);
    if (!row) return null;
    const tags = await this.fetchTagNames([id]);
    return mapItemRowToRecord(row, tags.get(id) ?? []);
  }

  async fetchItems(filters: ItemQueryFilters = {}): Promise<ItemRecord[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.type) {
      clauses.push("type = ?");
      params.push(filters.type);
    }
    if (filters.collectionId) {
      clauses.push("collection_id = ?");
      params.push(filters.collectionId);
    }
    if (filters.tag) {
      clauses.push(
        "id IN (SELECT it.item_id FROM item_tags it JOIN tags t ON t.id = it.tag_id WHERE t.name = ?)",
      );
      params.push(filters.tag);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await this.client.select<ItemRow>(
      `SELECT * FROM items ${whereClause} ORDER BY updated_at DESC`,
      params,
    );
    const ids = rows.map((row) => row.id);
    const tagNames = await this.fetchTagNames(ids);
    return rows.map((row) => mapItemRowToRecord(row, tagNames.get(row.id) ?? []));
  }

  private async fetchTagNames(itemIds: string[]): Promise<Map<string, string[]>> {
    if (itemIds.length === 0) return new Map();
    const placeholders = itemIds.map(() => "?").join(", ");
    const rows = await this.client.select<{ item_id: string; tag_name: string }>(
      `SELECT it.item_id, t.name as tag_name
       FROM item_tags it
       JOIN tags t ON t.id = it.tag_id
       WHERE it.item_id IN (${placeholders})`,
      itemIds,
    );
    const result = new Map<string, string[]>();
    for (const row of rows) {
      const current = result.get(row.item_id) ?? [];
      current.push(row.tag_name);
      result.set(row.item_id, current);
    }
    return result;
  }
}
