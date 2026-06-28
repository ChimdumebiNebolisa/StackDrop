import type { FailureStage, IndexedFolderRecord } from "../../../domain/documents/types";
import type { SqlClient } from "../../../data/db/sqliteClient";
import { FolderRepository } from "../../../data/repositories/folderRepository";

export type FolderHealthStatus = "healthy" | "never_scanned" | "has_failures" | "root_error" | "scan_incomplete";

export interface FolderIndexDiagnostics {
  folder: IndexedFolderRecord;
  status: FolderHealthStatus;
  totalDocuments: number;
  searchableDocuments: number;
  parseFailures: number;
  readFailures: number;
  unknownFailures: number;
  lastRun: {
    startedAt: string;
    finishedAt: string | null;
    filesDiscovered: number;
    filesIndexed: number;
    filesFailed: number;
  } | null;
}

export interface RecentIndexFailure {
  id: string;
  fileName: string;
  relativePath: string;
  absolutePath: string;
  folderRootPath: string;
  failureStage: FailureStage | null;
  parseError: string | null;
  updatedAt: string;
}

export interface IndexDiagnostics {
  folders: FolderIndexDiagnostics[];
  recentFailures: RecentIndexFailure[];
  totals: {
    indexedFolders: number;
    totalDocuments: number;
    searchableDocuments: number;
    parseFailures: number;
    readFailures: number;
    unknownFailures: number;
    rootErrors: number;
  };
  unsupportedSkippedFilesTracked: false;
}

interface FolderStatsRow {
  total_documents: number;
  searchable_documents: number;
  parse_failures: number;
  read_failures: number;
  unknown_failures: number;
}

interface ScanRunRow {
  started_at: string;
  finished_at: string | null;
  files_discovered: number;
  files_indexed: number;
  files_failed: number;
}

interface RecentFailureRow {
  id: string;
  file_name: string;
  relative_path: string;
  absolute_path: string;
  root_path: string;
  failure_stage: FailureStage | null;
  parse_error: string | null;
  updated_at: string;
}

function numberOrZero(value: number | null | undefined): number {
  return Number(value ?? 0);
}

function determineFolderStatus(
  folder: IndexedFolderRecord,
  stats: FolderStatsRow,
  lastRun: ScanRunRow | null,
): FolderHealthStatus {
  if (folder.lastError) return "root_error";
  if (lastRun && !lastRun.finished_at) return "scan_incomplete";
  if (!folder.lastScanAt && !lastRun) return "never_scanned";
  if (numberOrZero(stats.parse_failures) + numberOrZero(stats.read_failures) + numberOrZero(stats.unknown_failures) > 0) {
    return "has_failures";
  }
  return "healthy";
}

export async function getIndexDiagnostics(client: SqlClient): Promise<IndexDiagnostics> {
  const folders = await new FolderRepository(client).listFolders();
  const folderDiagnostics: FolderIndexDiagnostics[] = [];

  for (const folder of folders) {
    const stats = await client.get<FolderStatsRow>(
      `SELECT
         COUNT(*) AS total_documents,
         COALESCE(SUM(CASE WHEN parse_status IN ('parsed_text', 'parsed_ocr') THEN 1 ELSE 0 END), 0) AS searchable_documents,
         COALESCE(SUM(CASE WHEN parse_status = 'parse_failed' AND failure_stage = 'parse' THEN 1 ELSE 0 END), 0) AS parse_failures,
         COALESCE(SUM(CASE WHEN parse_status = 'parse_failed' AND failure_stage = 'read' THEN 1 ELSE 0 END), 0) AS read_failures,
         COALESCE(SUM(CASE WHEN parse_status = 'parse_failed' AND failure_stage IS NULL THEN 1 ELSE 0 END), 0) AS unknown_failures
       FROM indexed_documents
       WHERE folder_id = ?`,
      [folder.id],
    );
    const lastRun = await client.get<ScanRunRow>(
      `SELECT started_at, finished_at, files_discovered, files_indexed, files_failed
       FROM scan_runs
       WHERE folder_id = ?
       ORDER BY started_at DESC
       LIMIT 1`,
      [folder.id],
    );
    const safeStats = stats ?? {
      total_documents: 0,
      searchable_documents: 0,
      parse_failures: 0,
      read_failures: 0,
      unknown_failures: 0,
    };

    folderDiagnostics.push({
      folder,
      status: determineFolderStatus(folder, safeStats, lastRun),
      totalDocuments: numberOrZero(safeStats.total_documents),
      searchableDocuments: numberOrZero(safeStats.searchable_documents),
      parseFailures: numberOrZero(safeStats.parse_failures),
      readFailures: numberOrZero(safeStats.read_failures),
      unknownFailures: numberOrZero(safeStats.unknown_failures),
      lastRun: lastRun
        ? {
            startedAt: lastRun.started_at,
            finishedAt: lastRun.finished_at,
            filesDiscovered: numberOrZero(lastRun.files_discovered),
            filesIndexed: numberOrZero(lastRun.files_indexed),
            filesFailed: numberOrZero(lastRun.files_failed),
          }
        : null,
    });
  }

  const recentFailureRows = await client.select<RecentFailureRow>(
    `SELECT d.id, d.file_name, d.relative_path, d.absolute_path, d.failure_stage, d.parse_error, d.updated_at, f.root_path
     FROM indexed_documents d
     JOIN indexed_folders f ON d.folder_id = f.id
     WHERE d.parse_status = 'parse_failed'
     ORDER BY d.updated_at DESC
     LIMIT 6`,
  );

  const totals = folderDiagnostics.reduce(
    (acc, item) => {
      acc.totalDocuments += item.totalDocuments;
      acc.searchableDocuments += item.searchableDocuments;
      acc.parseFailures += item.parseFailures;
      acc.readFailures += item.readFailures;
      acc.unknownFailures += item.unknownFailures;
      if (item.status === "root_error") acc.rootErrors += 1;
      return acc;
    },
    {
      indexedFolders: folders.length,
      totalDocuments: 0,
      searchableDocuments: 0,
      parseFailures: 0,
      readFailures: 0,
      unknownFailures: 0,
      rootErrors: 0,
    },
  );

  return {
    folders: folderDiagnostics,
    recentFailures: recentFailureRows.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      relativePath: row.relative_path,
      absolutePath: row.absolute_path,
      folderRootPath: row.root_path,
      failureStage: row.failure_stage,
      parseError: row.parse_error,
      updatedAt: row.updated_at,
    })),
    totals,
    unsupportedSkippedFilesTracked: false,
  };
}
