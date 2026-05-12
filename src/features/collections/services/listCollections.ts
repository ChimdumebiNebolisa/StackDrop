import type { SqlClient } from "../../../data/db/sqliteClient";
import { CollectionRepository } from "../../../data/repositories/collectionRepository";

export async function listCollections(client: SqlClient) {
  return new CollectionRepository(client).listCollections();
}
