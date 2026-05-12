import { invoke } from "@tauri-apps/api/core";

import type { SqlClient } from "../../../data/db/sqliteClient";
import { importFile, type ImportFileResult } from "./importFile";

declare global {
  interface Window {
    __STACKDROP_E2E__?: {
      pickFile?: () => string | null;
      readFile?: (filePath: string) => number[] | Uint8Array | null;
    };
  }
}

export async function triggerFileImport(client: SqlClient): Promise<ImportFileResult | null> {
  if (import.meta.env.VITE_E2E_SQLITE === "1" && typeof window !== "undefined") {
    const selectedPath = window.__STACKDROP_E2E__?.pickFile?.() ?? null;
    if (!selectedPath) {
      return null;
    }
    return importFile({ filePath: selectedPath }, client);
  }

  const selectedPath = await invoke<string | null>("open_file_dialog");
  if (!selectedPath) {
    return null;
  }
  return importFile({ filePath: selectedPath }, client);
}
