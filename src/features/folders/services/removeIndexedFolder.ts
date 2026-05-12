import type { SqlClient } from "../../../data/db/sqliteClient";
import { FolderRepository } from "../../../data/repositories/folderRepository";

export async function removeIndexedFolder(folderId: string, client: SqlClient): Promise<void> {
  await new FolderRepository(client).deleteFolder(folderId);
}
