import type { SqlClient } from "../../../data/db/sqliteClient";
import { FolderRepository } from "../../../data/repositories/folderRepository";
import { logScanSummary } from "../../../lib/log";
import { runFolderScan } from "./runFolderScan";

export interface LibraryScanSummary {
  rootsTotal: number;
  rootsCompleted: number;
  discovered: number;
  indexed: number;
  failed: number;
  errors: string[];
}

/** Runs `runFolderScan` for every registered root, in order. */
export async function runAllFolderScans(client: SqlClient): Promise<LibraryScanSummary> {
  const folders = await new FolderRepository(client).listFolders();
  let discovered = 0;
  let indexed = 0;
  let failed = 0;
  const errors: string[] = [];
  let rootsCompleted = 0;

  for (const folder of folders) {
    try {
      const summary = await runFolderScan(folder.id, client);
      discovered += summary.discovered;
      indexed += summary.indexed;
      failed += summary.failed;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
    rootsCompleted += 1;
  }

  const out = {
    rootsTotal: folders.length,
    rootsCompleted,
    discovered,
    indexed,
    failed,
    errors,
  };
  logScanSummary("library_scan_complete", {
    rootsTotal: out.rootsTotal,
    discovered: out.discovered,
    indexed: out.indexed,
    failed: out.failed,
    errorCount: out.errors.length,
  });
  return out;
}
