import type { FileExtension } from "../../../domain/documents/types";
import type { SqlClient } from "../../../data/db/sqliteClient";
import { DocumentRepository } from "../../../data/repositories/documentRepository";
import { FolderRepository } from "../../../data/repositories/folderRepository";
import { DocumentSearchRepository } from "../../../data/search/documentSearchRepository";
import { logScanSummary } from "../../../lib/log";
import { invokeDiscoverSupportedFiles, invokeReadFileBytesUnderRoot } from "./tauriFolderFs";
import { parseDiscoveredFile } from "./parseDiscoveredFile";

const DEFAULT_FILE_READ_TIMEOUT_MS = 30_000;
const DEFAULT_FILE_PARSE_TIMEOUT_MS = 30_000;

export interface FolderScanSummary {
  discovered: number;
  indexed: number;
  failed: number;
}

export type FolderScanProgressPhase = "discovering" | "reading" | "parsing" | "indexing" | "finalizing";

export interface FolderScanProgress {
  folderId: string;
  rootPath: string;
  phase: FolderScanProgressPhase;
  discovered: number;
  indexed: number;
  failed: number;
  startedAtMs: number;
  currentFileName?: string;
}

export interface FolderScanOptions {
  signal?: AbortSignal;
  fileReadTimeoutMs?: number;
  fileParseTimeoutMs?: number;
  onProgress?: (progress: FolderScanProgress) => void;
}

interface ExistingScanState {
  id: string;
  modifiedAt: string;
  parseStatus: string;
}

interface ScanItem {
  file: Awaited<ReturnType<typeof invokeDiscoverSupportedFiles>>[number];
  existing: ExistingScanState | null;
  originalIndex: number;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  if (typeof signal.reason === "string") throw new Error(signal.reason);
  throw new Error("Folder scan cancelled.");
}

function timeoutMessage(stage: "read" | "parse", filePath: string, timeoutMs: number): string {
  return `File ${stage} timed out after ${Math.ceil(timeoutMs / 1000)} seconds: ${filePath}`;
}

function withTimeout<T>(work: Promise<T>, timeoutMs: number, onTimeout: () => Error): Promise<T> {
  if (timeoutMs <= 0) return work;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => reject(onTimeout()), timeoutMs);
    work.then(
      (value) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export async function runFolderScan(folderId: string, client: SqlClient, options: FolderScanOptions = {}): Promise<FolderScanSummary> {
  const folderRepo = new FolderRepository(client);
  const docRepo = new DocumentRepository(client);
  const searchRepo = new DocumentSearchRepository(client);
  const signal = options.signal;
  const fileReadTimeoutMs = options.fileReadTimeoutMs ?? DEFAULT_FILE_READ_TIMEOUT_MS;
  const fileParseTimeoutMs = options.fileParseTimeoutMs ?? DEFAULT_FILE_PARSE_TIMEOUT_MS;
  const startedAtMs = Date.now();

  throwIfAborted(signal);
  const folder = await folderRepo.getFolder(folderId);
  if (!folder) {
    throw new Error("Folder not found.");
  }

  const emitProgress = (
    phase: FolderScanProgressPhase,
    counts: { discovered?: number; indexed?: number; failed?: number; currentFileName?: string },
  ) => {
    options.onProgress?.({
      folderId,
      rootPath: folder.rootPath,
      phase,
      discovered: counts.discovered ?? 0,
      indexed: counts.indexed ?? 0,
      failed: counts.failed ?? 0,
      startedAtMs,
      currentFileName: counts.currentFileName,
    });
  };

  let discovered: Awaited<ReturnType<typeof invokeDiscoverSupportedFiles>>;
  try {
    throwIfAborted(signal);
    emitProgress("discovering", {});
    discovered = await invokeDiscoverSupportedFiles(folder.rootPath);
    throwIfAborted(signal);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await folderRepo.updateScanError(folderId, message, new Date().toISOString());
    throw error;
  }
  const keepPaths = new Set(discovered.map((d) => d.absolutePath));

  let indexed = 0;
  let failed = 0;
  const scanRunId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  await client.execute(
    `INSERT INTO scan_runs (id, folder_id, started_at, files_discovered, files_indexed, files_failed)
     VALUES (?, ?, ?, ?, 0, 0)`,
    [scanRunId, folderId, startedAt, discovered.length],
  );

  try {
    const scanItems: ScanItem[] = [];
    for (const [originalIndex, file] of discovered.entries()) {
      scanItems.push({
        file,
        existing: await docRepo.findScanStateByAbsolutePath(file.absolutePath),
        originalIndex,
      });
    }
    scanItems.sort((a, b) => scanPriority(a) - scanPriority(b) || a.originalIndex - b.originalIndex);

    for (const item of scanItems) {
      const file = item.file;
      throwIfAborted(signal);
      const id = item.existing?.id ?? crypto.randomUUID();
      const modifiedAt = new Date(file.modifiedAtMs).toISOString();
      const now = new Date().toISOString();

      let bytes: Uint8Array;
      try {
        emitProgress("reading", { discovered: discovered.length, indexed, failed, currentFileName: file.fileName });
        logScanSummary("file_read_start", { extension: file.extension, fileName: file.fileName });
        bytes = await withTimeout(
          invokeReadFileBytesUnderRoot(folder.rootPath, file.absolutePath),
          fileReadTimeoutMs,
          () => new Error(timeoutMessage("read", file.absolutePath, fileReadTimeoutMs)),
        );
        logScanSummary("file_read_complete", { extension: file.extension, fileName: file.fileName });
        throwIfAborted(signal);
      } catch (error) {
        throwIfAborted(signal);
        failed += 1;
        logScanSummary("file_read_failed", { extension: file.extension, fileName: file.fileName });
        await docRepo.upsertDocument({
          id,
          folderId,
          absolutePath: file.absolutePath,
          relativePath: file.relativePath,
          fileName: file.fileName,
          fileExtension: file.extension as FileExtension,
          sizeBytes: Number(file.sizeBytes),
          modifiedAt,
          parseStatus: "parse_failed",
          failureStage: "read",
          parseError: error instanceof Error ? error.message : String(error),
          extractedText: null,
          updatedAt: now,
        });
        await searchRepo.removeDocument(id);
        continue;
      }

      let parsed: Awaited<ReturnType<typeof parseDiscoveredFile>>;
      try {
        emitProgress("parsing", { discovered: discovered.length, indexed, failed, currentFileName: file.fileName });
        logScanSummary("file_parse_start", { extension: file.extension, fileName: file.fileName });
        parsed = await withTimeout(
          parseDiscoveredFile({
            rootPath: folder.rootPath,
            absolutePath: file.absolutePath,
            extension: file.extension,
            bytes,
          }),
          fileParseTimeoutMs,
          () => new Error(timeoutMessage("parse", file.absolutePath, fileParseTimeoutMs)),
        );
        logScanSummary("file_parse_complete", { extension: file.extension, fileName: file.fileName });
        throwIfAborted(signal);
      } catch (error) {
        throwIfAborted(signal);
        failed += 1;
        logScanSummary("file_parse_failed", { extension: file.extension, fileName: file.fileName });
        await docRepo.upsertDocument({
          id,
          folderId,
          absolutePath: file.absolutePath,
          relativePath: file.relativePath,
          fileName: file.fileName,
          fileExtension: file.extension as FileExtension,
          sizeBytes: Number(file.sizeBytes),
          modifiedAt,
          parseStatus: "parse_failed",
          failureStage: "parse",
          parseError: error instanceof Error ? error.message : String(error),
          extractedText: null,
          updatedAt: now,
        });
        await searchRepo.removeDocument(id);
        continue;
      }

      const parseStatus = parsed.parseStatus;
      if (parseStatus === "parsed_text" || parseStatus === "parsed_ocr") indexed += 1;
      else failed += 1;

      emitProgress("indexing", { discovered: discovered.length, indexed, failed, currentFileName: file.fileName });
      logScanSummary("file_upsert_start", { extension: file.extension, fileName: file.fileName });
      await docRepo.upsertDocument({
        id,
        folderId,
        absolutePath: file.absolutePath,
        relativePath: file.relativePath,
        fileName: file.fileName,
        fileExtension: file.extension as FileExtension,
        sizeBytes: Number(file.sizeBytes),
        modifiedAt,
        parseStatus,
        failureStage: parseStatus === "parse_failed" ? "parse" : null,
        parseError: parsed.parseError,
        extractedText: parsed.extractedText,
        updatedAt: now,
      });

      if (parseStatus === "parsed_text" || parseStatus === "parsed_ocr") {
        await searchRepo.indexDocument(id, file.fileName, file.relativePath, parsed.extractedText ?? "");
      } else {
        await searchRepo.removeDocument(id);
      }
      logScanSummary("file_upsert_complete", { extension: file.extension, fileName: file.fileName });
    }

    emitProgress("finalizing", { discovered: discovered.length, indexed, failed });
    await docRepo.deleteDocumentsNotInPaths(folderId, keepPaths);
  } finally {
    const finishedAt = new Date().toISOString();
    await client.execute(
      `UPDATE scan_runs SET finished_at = ?, files_indexed = ?, files_failed = ? WHERE id = ?`,
      [finishedAt, indexed, failed, scanRunId],
    );
    if (!signal?.aborted) {
      await folderRepo.updateLastScan(folderId, finishedAt);
    }
    logScanSummary("folder_scan_finished", { folderId, discovered: discovered.length, indexed, failed });
  }

  const summary = { discovered: discovered.length, indexed, failed };
  logScanSummary("folder_scan_complete", { folderId, ...summary });
  return summary;
}

function scanPriority(item: ScanItem): number {
  if (!item.existing) return 0;
  const modifiedAt = new Date(item.file.modifiedAtMs).toISOString();
  if (item.existing.modifiedAt !== modifiedAt) return 1;
  if (item.existing.parseStatus === "parse_failed") return 2;
  return 3;
}
