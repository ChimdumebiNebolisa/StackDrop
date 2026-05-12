import type { SqlClient } from "../../data/db/sqliteClient";
import { ItemRepository } from "../../data/repositories/itemRepository";
import { SearchRepository } from "../../data/search/searchRepository";

export async function removeItem(id: string, client: SqlClient): Promise<void> {
  const itemRepository = new ItemRepository(client);
  const item = await itemRepository.fetchItem(id);
  if (!item) {
    return;
  }

  const searchRepository = new SearchRepository(client);
  await searchRepository.removeItemFromIndex(id);
  await itemRepository.deleteItem(id);
}
