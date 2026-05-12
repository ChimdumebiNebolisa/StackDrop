import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestSqlClient } from "../../data/db/createTestSqlClient";
import { runMigrations } from "../../data/db/migrate";
import type { SqlClient } from "../../data/db/sqliteClient";
import { FolderRepository } from "../../data/repositories/folderRepository";
import { queryDocuments } from "../../features/documents/services/queryDocuments";
import { runFolderScan } from "../../features/folders/services/runFolderScan";
import * as tauriFolderFs from "../../features/folders/services/tauriFolderFs";

vi.mock("../../features/folders/services/tauriFolderFs", () => ({
  invokeOpenFolderDialog: vi.fn(),
  invokeDiscoverSupportedFiles: vi.fn(),
  invokeReadFileBytesUnderRoot: vi.fn(),
}));

describe("folder scan orchestration", () => {
  let client: SqlClient;

  beforeEach(async () => {
    client = await createTestSqlClient();
    await runMigrations(client);
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockReset();
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("indexes discovered txt and finds it via content search", async () => {
    const folderId = crypto.randomUUID();
    await new FolderRepository(client).insertFolder({
      id: folderId,
      rootPath: "C:\\fixture-root",
      createdAt: new Date().toISOString(),
    });
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValue([
      {
        absolutePath: "C:\\fixture-root\\nested\\a.txt",
        relativePath: "nested/a.txt",
        fileName: "a.txt",
        extension: "txt",
        sizeBytes: 12,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(
      new TextEncoder().encode("unique-stackdrop-scan-token"),
    );

    await runFolderScan(folderId, client);

    const hits = await queryDocuments(client, "unique-stackdrop-scan-token", {});
    expect(hits).toHaveLength(1);
    expect(hits[0].fileName).toBe("a.txt");
    expect(hits[0].parseStatus).toBe("indexed");
  });

  it("indexes docx and finds fixture token via content search", async () => {
    const folderId = crypto.randomUUID();
    await new FolderRepository(client).insertFolder({
      id: folderId,
      rootPath: "C:\\fixture-root",
      createdAt: new Date().toISOString(),
    });
    const docxBytes = await readFile(join(process.cwd(), "src/tests/fixtures/minimal.docx"));
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValue([
      {
        absolutePath: "C:\\fixture-root\\w.docx",
        relativePath: "w.docx",
        fileName: "w.docx",
        extension: "docx",
        sizeBytes: docxBytes.length,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(new Uint8Array(docxBytes));

    await runFolderScan(folderId, client);

    const hits = await queryDocuments(client, "stackdrop-docx-fixture-token", {});
    expect(hits).toHaveLength(1);
    expect(hits[0].fileName).toBe("w.docx");
    expect(hits[0].parseStatus).toBe("indexed");
  });

  it("removes documents missing after rescan", async () => {
    const folderId = crypto.randomUUID();
    await new FolderRepository(client).insertFolder({
      id: folderId,
      rootPath: "C:\\fixture-root",
      createdAt: new Date().toISOString(),
    });
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValueOnce([
      {
        absolutePath: "C:\\fixture-root\\a.txt",
        relativePath: "a.txt",
        fileName: "a.txt",
        extension: "txt",
        sizeBytes: 1,
        modifiedAtMs: Date.now(),
      },
      {
        absolutePath: "C:\\fixture-root\\b.txt",
        relativePath: "b.txt",
        fileName: "b.txt",
        extension: "txt",
        sizeBytes: 1,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(new TextEncoder().encode("x"));
    await runFolderScan(folderId, client);

    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValueOnce([
      {
        absolutePath: "C:\\fixture-root\\a.txt",
        relativePath: "a.txt",
        fileName: "a.txt",
        extension: "txt",
        sizeBytes: 1,
        modifiedAtMs: Date.now(),
      },
    ]);
    await runFolderScan(folderId, client);

    const all = await queryDocuments(client, "", { folderId });
    expect(all).toHaveLength(1);
    expect(all[0].fileName).toBe("a.txt");
  });
});
