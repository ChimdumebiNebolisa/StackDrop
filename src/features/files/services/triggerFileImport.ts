import { invoke } from "@tauri-apps/api/core";

import type { SqlClient } from "../../../data/db/sqliteClient";
import { importFile, type ImportFileResult } from "./importFile";

export async function triggerFileImport(client: SqlClient): Promise<ImportFileResult | null> {
  const selectedPath = await invoke<string | null>("open_file_dialog");
  if (!selectedPath) {
    return null;
  }
  return importFile({ filePath: selectedPath }, client);
}
