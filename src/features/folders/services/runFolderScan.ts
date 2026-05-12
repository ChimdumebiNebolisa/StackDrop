import { parseFileContent } from "../../../domain/ingestion/parseFile";
import type { FileExtension } from "../../../domain/documents/types";
import type { SqlClient } from "../../../data/db/sqliteClient";
import { DocumentRepository } from "../../../data/repositories/documentRepository";
import { FolderRepository } from "../../../data/repositories/folderRepository";
import { DocumentSearchRepository } from "../../../data/search/documentSearchRepository";
import { invokeDiscoverSupportedFiles, invokeReadFileBytesUnderRoot } from "./tauriFolderFs";

export interface FolderScanSummary {
  discovered: number;
  indexed: number;
  failed: number;
}

export async function runFolderScan(folderId: string, client: SqlClient): Promise<FolderScanSummary> {
  const folderRepo = new FolderRepository(client);
  const docRepo = new DocumentRepository(client);
  const searchRepo = new DocumentSearchRepository(client);

  const folder = await folderRepo.getFolder(folderId);
  if (!folder) {
    throw new Error("Folder not found.");
  }

  const discovered = await invokeDiscoverSupportedFiles(folder.rootPath);
  const keepPaths = new Set(discovered.map((d) => d.absolutePath));

  const scanRunId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  await client.execute(
    `INSERT INTO scan_runs (id, folder_id, started_at, files_discovered, files_indexed, files_failed)
     VALUES (?, ?, ?, ?, 0, 0)`,
    [scanRunId, folderId, startedAt, discovered.length],
  );

  let indexed = 0;
  let failed = 0;

  for (const file of discovered) {
    const existingId = await docRepo.findIdByAbsolutePath(file.absolutePath);
    const id = existingId ?? crypto.randomUUID();
    const modifiedAt = new Date(file.modifiedAtMs).toISOString();
    const now = new Date().toISOString();

    let bytes: Uint8Array;
    try {
      bytes = await invokeReadFileBytesUnderRoot(folder.rootPath, file.absolutePath);
    } catch (error) {
      failed += 1;
      await docRepo.upsertDocument({
        id,
        folderId,
        absolutePath: file.absolutePath,
        relativePath: file.relativePath,
        fileName: file.fileName,
        fileExtension: file.extension as FileExtension,
        sizeBytes: Number(file.sizeBytes),
        modifiedAt,
        parseStatus: "failed",
        parseError: error instanceof Error ? error.message : String(error),
        extractedText: null,
        updatedAt: now,
      });
      await searchRepo.removeDocument(id);
      continue;
    }

    const parsed = await parseFileContent(`.${file.extension}`, bytes);
    const parseStatus = parsed.status === "indexed" ? "indexed" : "failed";
    if (parseStatus === "indexed") indexed += 1;
    else failed += 1;

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
      parseError: parseStatus === "failed" ? (parsed.error ?? "Parse failed") : null,
      extractedText: parsed.extractedText ?? null,
      updatedAt: now,
    });

    if (parseStatus === "indexed") {
      await searchRepo.indexDocument(id, file.fileName, parsed.extractedText ?? "");
    } else {
      await searchRepo.removeDocument(id);
    }
  }

  await docRepo.deleteDocumentsNotInPaths(folderId, keepPaths);

  const finishedAt = new Date().toISOString();
  await client.execute(
    `UPDATE scan_runs SET finished_at = ?, files_indexed = ?, files_failed = ? WHERE id = ?`,
    [finishedAt, indexed, failed, scanRunId],
  );
  await folderRepo.updateLastScan(folderId, finishedAt);

  return { discovered: discovered.length, indexed, failed };
}
