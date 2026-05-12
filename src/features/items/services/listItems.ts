import type { SqlClient } from "../../../data/db/sqliteClient";
import { ItemRepository } from "../../../data/repositories/itemRepository";
import type { ItemQueryFilters, ItemRecord } from "../../../domain/items/types";

export async function listItems(
  filters: ItemQueryFilters,
  client: SqlClient,
): Promise<ItemRecord[]> {
  const repository = new ItemRepository(client);
  return repository.fetchItems(filters);
}
