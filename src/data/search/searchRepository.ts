import type { ItemQueryFilters, ItemRecord } from "../../domain/items/types";
import { mapItemRowToRecord } from "../mappers/itemMapper";
import type { SqlClient } from "../db/sqliteClient";

interface SearchRow {
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

function toFtsQuery(input: string): string {
  const terms = input
    .split(/[^\p{L}\p{N}_]+/u)
    .map((term) => term.trim())
    .filter(Boolean);
  return terms.map((term) => `"${term.replaceAll('"', '""')}"`).join(" ");
}

export class SearchRepository {
  constructor(private readonly client: SqlClient) {}

  async indexItem(itemId: string, title: string, body: string): Promise<void> {
    await this.client.execute("DELETE FROM item_search WHERE item_id = ?", [itemId]);
    await this.client.execute(
      "INSERT INTO item_search (item_id, title, body) VALUES (?, ?, ?)",
      [itemId, title, body],
    );
  }

  async removeItemFromIndex(itemId: string): Promise<void> {
    await this.client.execute("DELETE FROM item_search WHERE item_id = ?", [itemId]);
  }

  async searchIndex(query: string, filters: ItemQueryFilters = {}): Promise<ItemRecord[]> {
    const ftsQuery = toFtsQuery(query);
    if (!ftsQuery) {
      return [];
    }

    const clauses = ["s.item_id = i.id", "item_search MATCH ?"];
    const params: unknown[] = [ftsQuery];
    if (filters.type) {
      clauses.push("i.type = ?");
      params.push(filters.type);
    }
    if (filters.tag) {
      clauses.push(
        "i.id IN (SELECT it.item_id FROM item_tags it JOIN tags t ON t.id = it.tag_id WHERE t.name = ?)",
      );
      params.push(filters.tag);
    }
    const orderBy =
      filters.sort === "recent" ? "i.updated_at DESC" : "bm25(item_search), i.updated_at DESC";
    const rows = await this.client.select<SearchRow>(
      `SELECT i.*
       FROM item_search s
       JOIN items i ON ${clauses.join(" AND ")}
       ORDER BY ${orderBy}`,
      params,
    );

    const tagRows = await this.client.select<{ item_id: string; name: string }>(
      `SELECT it.item_id, t.name
       FROM item_tags it
       JOIN tags t ON t.id = it.tag_id`,
    );
    const tagsByItemId = new Map<string, string[]>();
    for (const tagRow of tagRows) {
      const tags = tagsByItemId.get(tagRow.item_id) ?? [];
      tags.push(tagRow.name);
      tagsByItemId.set(tagRow.item_id, tags);
    }

    return rows.map((row) => mapItemRowToRecord(row, tagsByItemId.get(row.id) ?? []));
  }
}
