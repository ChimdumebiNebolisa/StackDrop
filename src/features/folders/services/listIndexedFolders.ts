import type { SqlClient } from "../../../data/db/sqliteClient";
import { FolderRepository } from "../../../data/repositories/folderRepository";
import type { IndexedFolderRecord } from "../../../domain/documents/types";

export async function listIndexedFolders(client: SqlClient): Promise<IndexedFolderRecord[]> {
  return new FolderRepository(client).listFolders();
}
