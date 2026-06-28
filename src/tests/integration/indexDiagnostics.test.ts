import { beforeEach, describe, expect, it } from "vitest";

import { createTestSqlClient } from "../../data/db/createTestSqlClient";
import { runMigrations } from "../../data/db/migrate";
import type { SqlClient } from "../../data/db/sqliteClient";
import { DocumentRepository } from "../../data/repositories/documentRepository";
import { FolderRepository } from "../../data/repositories/folderRepository";
import { getIndexDiagnostics } from "../../features/folders/services/getIndexDiagnostics";

describe("index diagnostics", () => {
  let client: SqlClient;
  let folderId: string;

  beforeEach(async () => {
    client = await createTestSqlClient();
    await runMigrations(client);
    folderId = crypto.randomUUID();
    await new FolderRepository(client).insertFolder({
      id: folderId,
      rootPath: "C:\\diag-root",
      createdAt: "2026-06-01T00:00:00.000Z",
    });
  });

  async function addDocument(opts: {
    fileName: string;
    parseStatus: "parsed_text" | "parsed_ocr" | "parse_failed";
    failureStage?: "read" | "parse" | null;
    parseError?: string | null;
  }) {
    await new DocumentRepository(client).upsertDocument({
      id: crypto.randomUUID(),
      folderId,
      absolutePath: `C:\\diag-root\\${opts.fileName}`,
      relativePath: opts.fileName,
      fileName: opts.fileName,
      fileExtension: "txt",
      sizeBytes: 10,
      modifiedAt: "2026-06-02T00:00:00.000Z",
      parseStatus: opts.parseStatus,
      failureStage: opts.failureStage ?? null,
      parseError: opts.parseError ?? null,
      extractedText: opts.parseStatus === "parse_failed" ? null : "body",
      updatedAt: "2026-06-03T00:00:00.000Z",
    });
  }

  it("summarizes searchable documents, read failures, parser failures, and recent failures", async () => {
    await addDocument({ fileName: "ok.txt", parseStatus: "parsed_text" });
    await addDocument({
      fileName: "read-fail.txt",
      parseStatus: "parse_failed",
      failureStage: "read",
      parseError: "access denied",
    });
    await addDocument({
      fileName: "parse-fail.txt",
      parseStatus: "parse_failed",
      failureStage: "parse",
      parseError: "malformed document",
    });
    await client.execute(
      `INSERT INTO scan_runs (id, folder_id, started_at, finished_at, files_discovered, files_indexed, files_failed)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), folderId, "2026-06-03T00:00:00.000Z", "2026-06-03T00:01:00.000Z", 3, 1, 2],
    );
    await new FolderRepository(client).updateLastScan(folderId, "2026-06-03T00:01:00.000Z");

    const diagnostics = await getIndexDiagnostics(client);

    expect(diagnostics.totals).toMatchObject({
      indexedFolders: 1,
      totalDocuments: 3,
      searchableDocuments: 1,
      parseFailures: 1,
      readFailures: 1,
      unknownFailures: 0,
      rootErrors: 0,
    });
    expect(diagnostics.folders[0]).toMatchObject({
      status: "has_failures",
      totalDocuments: 3,
      searchableDocuments: 1,
      parseFailures: 1,
      readFailures: 1,
    });
    expect(diagnostics.folders[0].lastRun).toMatchObject({
      filesDiscovered: 3,
      filesIndexed: 1,
      filesFailed: 2,
    });
    expect(diagnostics.recentFailures.map((failure) => failure.fileName)).toEqual(
      expect.arrayContaining(["read-fail.txt", "parse-fail.txt"]),
    );
    expect(diagnostics.unsupportedSkippedFilesTracked).toBe(false);
  });

  it("reports folder root errors as folder health issues", async () => {
    await new FolderRepository(client).updateScanError(folderId, "root unavailable", "2026-06-04T00:00:00.000Z");

    const diagnostics = await getIndexDiagnostics(client);

    expect(diagnostics.totals.rootErrors).toBe(1);
    expect(diagnostics.folders[0].status).toBe("root_error");
    expect(diagnostics.folders[0].folder.lastError).toBe("root unavailable");
  });

  it("adds diagnostics columns to existing databases", async () => {
    const legacy = await createTestSqlClient();
    await legacy.execute(`CREATE TABLE indexed_folders (
      id TEXT PRIMARY KEY,
      root_path TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      last_scan_at TEXT
    )`);
    await legacy.execute(`CREATE TABLE indexed_documents (
      id TEXT PRIMARY KEY,
      folder_id TEXT NOT NULL REFERENCES indexed_folders(id) ON DELETE CASCADE,
      absolute_path TEXT NOT NULL UNIQUE,
      relative_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_extension TEXT NOT NULL CHECK (file_extension IN ('txt', 'pdf', 'docx', 'doc')),
      size_bytes INTEGER NOT NULL,
      modified_at TEXT NOT NULL,
      parse_status TEXT NOT NULL CHECK (parse_status IN ('parsed_text', 'parsed_ocr', 'parse_failed')),
      parse_error TEXT,
      extracted_text TEXT,
      updated_at TEXT NOT NULL
    )`);

    await runMigrations(legacy);

    const folderColumns = await legacy.select<{ name: string }>("PRAGMA table_info(indexed_folders)");
    const documentColumns = await legacy.select<{ name: string }>("PRAGMA table_info(indexed_documents)");
    expect(folderColumns.map((column) => column.name)).toContain("last_error");
    expect(folderColumns.map((column) => column.name)).toContain("last_error_at");
    expect(documentColumns.map((column) => column.name)).toContain("failure_stage");
  });
});
