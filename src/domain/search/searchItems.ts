import type { SqlClient } from "../../data/db/sqliteClient";
import { SearchRepository } from "../../data/search/searchRepository";
import type { ItemQueryFilters, ItemRecord } from "../items/types";

export async function searchItems(
  query: string,
  filters: ItemQueryFilters,
  client: SqlClient,
): Promise<ItemRecord[]> {
  const repository = new SearchRepository(client);
  return repository.searchIndex(query, filters);
}
