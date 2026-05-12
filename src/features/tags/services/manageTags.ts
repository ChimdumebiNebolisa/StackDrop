import type { SqlClient } from "../../../data/db/sqliteClient";
import { TagRepository } from "../../../data/repositories/tagRepository";

export async function manageTags(itemId: string, tags: string[], client: SqlClient): Promise<void> {
  const repository = new TagRepository(client);
  await repository.upsertTags(itemId, tags);
}
