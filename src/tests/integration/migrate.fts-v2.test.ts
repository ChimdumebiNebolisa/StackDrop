import { beforeEach, describe, expect, it } from "vitest";

import { createTestSqlClient } from "../../data/db/createTestSqlClient";
import { FILE_EXTENSION_CHECK_SQL } from "../../data/db/generatedFileCapabilities";
import { runMigrations } from "../../data/db/migrate";
import type { SqlClient } from "../../data/db/sqliteClient";

describe("FTS v2 migration (relative_path column)", () => {
  let client: SqlClient;

  beforeEach(async () => {
    client = await createTestSqlClient();
  });

  it("migrates old 2-column FTS to 3-column FTS", async () => {
    await client.execute("PRAGMA foreign_keys = ON");
    await client.execute(`CREATE TABLE IF NOT EXISTS indexed_folders (
      id TEXT PRIMARY KEY, root_path TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, last_scan_at TEXT
    )`);
    await client.execute(`CREATE TABLE IF NOT EXISTS indexed_documents (
      id TEXT PRIMARY KEY,
      folder_id TEXT NOT NULL REFERENCES indexed_folders(id) ON DELETE CASCADE,
      absolute_path TEXT NOT NULL UNIQUE,
      relative_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_extension TEXT NOT NULL CHECK (${FILE_EXTENSION_CHECK_SQL}),
      size_bytes INTEGER NOT NULL,
      modified_at TEXT NOT NULL,
      parse_status TEXT NOT NULL CHECK (parse_status IN ('parsed_text', 'parsed_ocr', 'parse_failed')),
      parse_error TEXT,
      extracted_text TEXT,
      updated_at TEXT NOT NULL
    )`);
    await client.execute(`CREATE VIRTUAL TABLE IF NOT EXISTS document_search USING fts5(
      document_id UNINDEXED, file_name, body
    )`);
    await client.execute(`CREATE TABLE IF NOT EXISTS scan_runs (
      id TEXT PRIMARY KEY, folder_id TEXT NOT NULL REFERENCES indexed_folders(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL, finished_at TEXT, files_discovered INTEGER NOT NULL DEFAULT 0,
      files_indexed INTEGER NOT NULL DEFAULT 0, files_failed INTEGER NOT NULL DEFAULT 0
    )`);

    const folderId = crypto.randomUUID();
    const docId = crypto.randomUUID();
    const now = new Date().toISOString();
    await client.execute(
      "INSERT INTO indexed_folders (id, root_path, created_at) VALUES (?, ?, ?)",
      [folderId, "/tmp/root", now],
    );
    await client.execute(
      `INSERT INTO indexed_documents (id, folder_id, absolute_path, relative_path, file_name, file_extension, size_bytes, modified_at, parse_status, parse_error, extracted_text, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [docId, folderId, "/tmp/root/sub/a.txt", "sub/a.txt", "a.txt", "txt", 11, now, "parsed_text", null, "hello world", now],
    );
    await client.execute(
      "INSERT INTO document_search (document_id, file_name, body) VALUES (?, ?, ?)",
      [docId, "a.txt", "hello world"],
    );

    await runMigrations(client);

    const row = await client.get<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='document_search'",
    );
    expect(row?.sql).toContain("relative_path");

    const fts = await client.select<{ document_id: string; file_name: string; relative_path: string; body: string }>(
      "SELECT * FROM document_search WHERE document_id = ?",
      [docId],
    );
    expect(fts).toHaveLength(1);
    expect(fts[0].relative_path).toBe("sub/a.txt");
    expect(fts[0].body).toBe("hello world");
  });

  it("migration is idempotent", async () => {
    await runMigrations(client);
    await runMigrations(client);
    const row = await client.get<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='document_search'",
    );
    expect(row?.sql).toContain("relative_path");
  });

  it("fresh database gets new schema directly", async () => {
    await runMigrations(client);
    const row = await client.get<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='document_search'",
    );
    expect(row?.sql).toContain("relative_path");
    expect(row?.sql).toContain("file_name");
    expect(row?.sql).toContain("body");
  });
});
