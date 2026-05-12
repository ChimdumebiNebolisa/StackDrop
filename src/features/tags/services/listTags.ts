import type { SqlClient } from "../../../data/db/sqliteClient";
import { TagRepository } from "../../../data/repositories/tagRepository";

export async function listTags(client: SqlClient) {
  return new TagRepository(client).listTags();
}
