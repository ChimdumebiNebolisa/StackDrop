import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestSqlClient } from "../../data/db/createTestSqlClient";
import { runMigrations } from "../../data/db/migrate";
import type { SqlClient } from "../../data/db/sqliteClient";
import { DocumentRepository } from "../../data/repositories/documentRepository";
import { FolderRepository } from "../../data/repositories/folderRepository";
import { DocumentSearchRepository } from "../../data/search/documentSearchRepository";

describe("v1 repositories", () => {
  let client: SqlClient;

  beforeEach(async () => {
    client = await createTestSqlClient();
    await runMigrations(client);
  });

  it("inserts folder and document and supports FTS search", async () => {
    const folders = new FolderRepository(client);
    const docs = new DocumentRepository(client);
    const search = new DocumentSearchRepository(client);
    const folderId = crypto.randomUUID();
    const docId = crypto.randomUUID();
    const now = new Date().toISOString();
    await folders.insertFolder({ id: folderId, rootPath: "/tmp/root", createdAt: now });
    await docs.upsertDocument({
      id: docId,
      folderId,
      absolutePath: "/tmp/root/a.txt",
      relativePath: "a.txt",
      fileName: "a.txt",
      fileExtension: "txt",
      sizeBytes: 5,
      modifiedAt: now,
      parseStatus: "parsed_text",
      parseError: null,
      extractedText: "hello world",
      updatedAt: now,
    });
    await search.indexDocument(docId, "a.txt", "hello world");
    const hits = await search.searchDocuments("world", {});
    expect(hits.map((h) => h.id)).toContain(docId);
  });

  it("removes legacy v0 items table when present", async () => {
    await client.execute("CREATE TABLE items (id TEXT PRIMARY KEY)");
    await runMigrations(client);
    const row = await client.get<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'items'",
    );
    expect(row).toBeNull();
  });
});
