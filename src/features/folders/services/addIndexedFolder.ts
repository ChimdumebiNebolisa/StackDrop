import type { SqlClient } from "../../../data/db/sqliteClient";
import { FolderRepository } from "../../../data/repositories/folderRepository";
import { invokeOpenFolderDialog } from "./tauriFolderFs";

export async function addIndexedFolder(client: SqlClient): Promise<string | null> {
  const path = await invokeOpenFolderDialog();
  if (!path) return null;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await new FolderRepository(client).insertFolder({ id, rootPath: path, createdAt: now });
  return id;
}
