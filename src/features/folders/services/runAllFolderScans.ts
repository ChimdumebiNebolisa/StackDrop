import type { SqlClient } from "../../../data/db/sqliteClient";
import { FolderRepository } from "../../../data/repositories/folderRepository";
import { logScanSummary } from "../../../lib/log";
import { runFolderScan, type FolderScanProgress } from "./runFolderScan";

const DEFAULT_ROOT_SCAN_TIMEOUT_MS = 120_000;

export interface LibraryScanSummary {
  rootsTotal: number;
  rootsCompleted: number;
  discovered: number;
  indexed: number;
  failed: number;
  errors: string[];
}

export interface LibraryScanOptions {
  rootTimeoutMs?: number;
  onProgress?: (progress: FolderScanProgress) => void;
}

function scanWithTimeout<T>(
  scan: Promise<T>,
  timeoutMs: number,
  onTimeout: (error: Error) => Promise<void> | void,
): Promise<T> {
  if (timeoutMs <= 0) return scan;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;

  return new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      const error = new Error(`Root scan timed out after ${Math.ceil(timeoutMs / 1000)} seconds.`);
      void Promise.resolve(onTimeout(error)).finally(() => reject(error));
    }, timeoutMs);

    scan.then(
      (value) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (!timedOut) resolve(value);
      },
      (error) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (!timedOut) reject(error);
      },
    );
  });
}

/** Runs `runFolderScan` for every registered root, in order. */
export async function runAllFolderScans(client: SqlClient, options: LibraryScanOptions = {}): Promise<LibraryScanSummary> {
  const folderRepo = new FolderRepository(client);
  const folders = await folderRepo.listFolders();
  const rootTimeoutMs = options.rootTimeoutMs ?? DEFAULT_ROOT_SCAN_TIMEOUT_MS;
  let discovered = 0;
  let indexed = 0;
  let failed = 0;
  const errors: string[] = [];
  let rootsCompleted = 0;

  for (const folder of folders) {
    const controller = new AbortController();
    try {
      const summary = await scanWithTimeout(
        runFolderScan(folder.id, client, { signal: controller.signal, onProgress: options.onProgress }),
        rootTimeoutMs,
        (error) => {
          controller.abort(error);
          return folderRepo.updateScanError(folder.id, error.message, new Date().toISOString());
        },
      );
      discovered += summary.discovered;
      indexed += summary.indexed;
      failed += summary.failed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${folder.rootPath}: ${message}`);
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
