import type { ItemRecord } from "../../domain/items/types";

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

export function mapItemRowToRecord(row: ItemRow, tags: string[]): ItemRecord {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    sourcePath: row.source_path,
    sourceUrl: row.source_url,
    previewText: row.preview_text,
    isIndexed: row.is_indexed === 1,
    parseStatus: row.parse_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    collectionId: row.collection_id,
    tags,
  };
}
