import type { SqlClient } from "../../../data/db/sqliteClient";
import { CollectionRepository } from "../../../data/repositories/collectionRepository";

export async function assignCollection(
  itemId: string,
  collectionId: string,
  client: SqlClient,
): Promise<void> {
  const repository = new CollectionRepository(client);
  await repository.setCollection(itemId, collectionId);
}

export async function removeCollectionAssignment(itemId: string, client: SqlClient): Promise<void> {
  const repository = new CollectionRepository(client);
  await repository.clearCollection(itemId);
}
