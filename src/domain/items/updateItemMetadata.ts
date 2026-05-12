import type { SqlClient } from "../../data/db/sqliteClient";
import { ItemRepository } from "../../data/repositories/itemRepository";
import { reindexItemSearch } from "./reindexItemSearch";

export interface UpdateItemMetadataInput {
  id: string;
  title: string;
}

export async function updateItemMetadata(
  input: UpdateItemMetadataInput,
  client: SqlClient,
): Promise<void> {
  const itemRepository = new ItemRepository(client);
  const item = await itemRepository.fetchItem(input.id);
  if (!item) {
    throw new Error("Item not found.");
  }
  const title = input.title.trim();
  if (!title) {
    throw new Error("Item title is required.");
  }

  await itemRepository.updateItem({
    id: item.id,
    type: item.type,
    title,
    sourcePath: item.sourcePath,
    sourceUrl: item.sourceUrl,
    previewText: item.previewText,
    isIndexed: item.isIndexed,
    parseStatus: item.parseStatus,
    createdAt: item.createdAt,
    updatedAt: new Date().toISOString(),
    collectionId: item.collectionId,
  });
  await reindexItemSearch(item.id, client);
}
