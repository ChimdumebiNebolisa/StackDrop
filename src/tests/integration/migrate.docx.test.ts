import { describe, expect, it } from "vitest";

import { createTestSqlClient } from "../../data/db/createTestSqlClient";
import { migrateIndexedDocumentsSchema } from "../../data/db/migrate";
import type { SqlClient } from "../../data/db/sqliteClient";
import { DocumentRepository } from "../../data/repositories/documentRepository";
import { FolderRepository } from "../../data/repositories/folderRepository";

async function createLegacyV11Tables(client: SqlClient): Promise<void> {
  await client.execute(`CREATE TABLE indexed_folders (
    id TEXT PRIMARY KEY,
    root_path TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    last_scan_at TEXT
  )`);
  await client.execute(`CREATE TABLE indexed_documents (
    id TEXT PRIMARY KEY,
    folder_id TEXT NOT NULL REFERENCES indexed_folders(id) ON DELETE CASCADE,
    absolute_path TEXT NOT NULL UNIQUE,
    relative_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_extension TEXT NOT NULL CHECK (file_extension IN ('txt', 'md', 'pdf')),
    size_bytes INTEGER NOT NULL,
    modified_at TEXT NOT NULL,
    parse_status TEXT NOT NULL CHECK (parse_status IN ('indexed', 'failed')),
    parse_error TEXT,
    extracted_text TEXT,
    updated_at TEXT NOT NULL
  )`);
  await client.execute(`CREATE VIRTUAL TABLE document_search USING fts5(
    document_id UNINDEXED,
    file_name,
    body
  )`);
}

describe("migrateIndexedDocumentsSchema", () => {
  it("rebuilds table so docx rows can be inserted", async () => {
    const client = await createTestSqlClient();
    await createLegacyV11Tables(client);
    await migrateIndexedDocumentsSchema(client);

    const folderId = crypto.randomUUID();
    const now = new Date().toISOString();
    await new FolderRepository(client).insertFolder({
      id: folderId,
      rootPath: "/virtual/root",
      createdAt: now,
    });
    await new DocumentRepository(client).upsertDocument({
      id: crypto.randomUUID(),
      folderId,
      absolutePath: "/virtual/root/w.docx",
      relativePath: "w.docx",
      fileName: "w.docx",
      fileExtension: "docx",
      sizeBytes: 10,
      modifiedAt: now,
      parseStatus: "parsed_text",
      parseError: null,
      extractedText: "hello",
      updatedAt: now,
    });

    const row = await client.get<{ file_extension: string }>(
      "SELECT file_extension FROM indexed_documents WHERE file_name = 'w.docx'",
    );
    expect(row?.file_extension).toBe("docx");
  });

  it("drops markdown rows when migrating from md-capable schema", async () => {
    const client = await createTestSqlClient();
    await createLegacyV11Tables(client);
    const folderId = crypto.randomUUID();
    const now = new Date().toISOString();
    await new FolderRepository(client).insertFolder({
      id: folderId,
      rootPath: "/virtual/root",
      createdAt: now,
    });
    await client.execute(
      `INSERT INTO indexed_documents (id, folder_id, absolute_path, relative_path, file_name, file_extension, size_bytes, modified_at, parse_status, parse_error, extracted_text, updated_at)
       VALUES (?, ?, ?, 'n.txt', 'n.txt', 'txt', 1, ?, 'indexed', NULL, NULL, ?)`,
      [crypto.randomUUID(), folderId, "/virtual/root/n.txt", now, now],
    );
    await client.execute(
      `INSERT INTO indexed_documents (id, folder_id, absolute_path, relative_path, file_name, file_extension, size_bytes, modified_at, parse_status, parse_error, extracted_text, updated_at)
       VALUES (?, ?, ?, 'x.md', 'x.md', 'md', 1, ?, 'indexed', NULL, 'x', ?)`,
      [crypto.randomUUID(), folderId, "/virtual/root/x.md", now, now],
    );

    await migrateIndexedDocumentsSchema(client);

    const mdCount = await client.get<{ c: number }>(
      "SELECT COUNT(*) as c FROM indexed_documents WHERE file_extension = 'md'",
    );
    expect(mdCount?.c).toBe(0);
    const legacyStatusCount = await client.get<{ c: number }>(
      "SELECT COUNT(*) as c FROM indexed_documents WHERE parse_status IN ('indexed', 'failed')",
    );
    expect(legacyStatusCount?.c).toBe(0);
  });
});
