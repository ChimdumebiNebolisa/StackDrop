import type { SqlClient } from "../../../data/db/sqliteClient";
import { CollectionRepository } from "../../../data/repositories/collectionRepository";

export async function createCollection(name: string, client: SqlClient): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Collection name is required.");
  }
  return new CollectionRepository(client).createCollection(trimmed);
}
