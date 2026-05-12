import type { SqlClient } from "../../../data/db/sqliteClient";
import { FolderRepository } from "../../../data/repositories/folderRepository";
import { invokeDefaultDocumentRoots } from "./tauriFolderFs";

/**
 * When no folders are registered, inserts OS default document locations (Documents, Desktop, Downloads).
 * Skips silently if Tauri is unavailable (e.g. pure web dev without shim).
 */
export async function ensureDefaultLibraryRoots(client: SqlClient): Promise<void> {
  const repo = new FolderRepository(client);
  const existing = await repo.listFolders();
  if (existing.length > 0) return;

  let roots: { path: string; label: string }[] = [];
  try {
    roots = await invokeDefaultDocumentRoots();
  } catch {
    return;
  }

  const now = new Date().toISOString();
  for (const r of roots) {
    const dup = await client.get<{ one: number }>(
      "SELECT 1 AS one FROM indexed_folders WHERE root_path = ? LIMIT 1",
      [r.path],
    );
    if (dup) continue;
    try {
      await repo.insertFolder({ id: crypto.randomUUID(), rootPath: r.path, createdAt: now });
    } catch {
      // UNIQUE root_path race — ignore
    }
  }
}
