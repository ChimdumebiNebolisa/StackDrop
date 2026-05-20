import { beforeEach, describe, expect, it } from "vitest";

import { createTestSqlClient } from "../../data/db/createTestSqlClient";
import { runMigrations } from "../../data/db/migrate";
import type { SqlClient } from "../../data/db/sqliteClient";
import { DocumentRepository } from "../../data/repositories/documentRepository";
import { FolderRepository } from "../../data/repositories/folderRepository";
import { DocumentSearchRepository, toFtsQuery, toFtsQueryWithPrefix } from "../../data/search/documentSearchRepository";
import { queryDocuments } from "../../features/documents/services/queryDocuments";

describe("search accuracy improvements", () => {
  let client: SqlClient;
  let folderId: string;

  beforeEach(async () => {
    client = await createTestSqlClient();
    await runMigrations(client);
    folderId = crypto.randomUUID();
    await new FolderRepository(client).insertFolder({
      id: folderId,
      rootPath: "/tmp/test-root",
      createdAt: new Date().toISOString(),
    });
  });

  async function indexDoc(opts: {
    fileName: string;
    relativePath: string;
    body: string;
    updatedAt?: string;
  }) {
    const id = crypto.randomUUID();
    const now = opts.updatedAt ?? new Date().toISOString();
    const docs = new DocumentRepository(client);
    const search = new DocumentSearchRepository(client);
    await docs.upsertDocument({
      id,
      folderId,
      absolutePath: `/tmp/test-root/${opts.relativePath}`,
      relativePath: opts.relativePath,
      fileName: opts.fileName,
      fileExtension: "txt",
      sizeBytes: opts.body.length,
      modifiedAt: now,
      parseStatus: "parsed_text",
      parseError: null,
      extractedText: opts.body,
      updatedAt: now,
    });
    await search.indexDocument(id, opts.fileName, opts.relativePath, opts.body);
    return id;
  }

  describe("toFtsQuery", () => {
    it("returns empty for empty input", () => {
      expect(toFtsQuery("")).toBe("");
      expect(toFtsQuery("   ")).toBe("");
    });

    it("wraps single word in quotes", () => {
      expect(toFtsQuery("hello")).toBe('"hello"');
    });

    it("handles multi-word input", () => {
      expect(toFtsQuery("hello world")).toBe('"hello" "world"');
    });

    it("escapes quotes safely", () => {
      expect(toFtsQuery('he said "hi"')).toBe('"he" "said" "hi"');
    });

    it("handles special characters gracefully", () => {
      expect(toFtsQuery("@#$%")).toBe("");
      expect(toFtsQuery("hello@world")).toBe('"hello" "world"');
    });
  });

  describe("toFtsQueryWithPrefix", () => {
    it("adds prefix to single term", () => {
      expect(toFtsQueryWithPrefix("hel")).toBe("hel*");
    });

    it("adds prefix to last term only", () => {
      expect(toFtsQueryWithPrefix("hello wor")).toBe('"hello" wor*');
    });

    it("single char does not get prefix", () => {
      expect(toFtsQueryWithPrefix("a")).toBe('"a"');
    });
  });

  describe("ranking", () => {
    it("filename match ranks above body-only match", async () => {
      await indexDoc({
        fileName: "report.txt",
        relativePath: "report.txt",
        body: "This document contains the word searchterm in its body.",
      });
      await indexDoc({
        fileName: "searchterm.txt",
        relativePath: "searchterm.txt",
        body: "This is an unrelated document about cooking.",
      });

      const hits = await queryDocuments(client, "searchterm", {});
      expect(hits.length).toBeGreaterThanOrEqual(2);
      expect(hits[0].fileName).toBe("searchterm.txt");
    });

    it("exact filename match ranks first", async () => {
      await indexDoc({
        fileName: "notes.txt",
        relativePath: "notes.txt",
        body: "notes about programming and daily tasks",
      });
      await indexDoc({
        fileName: "my-notes-backup.txt",
        relativePath: "my-notes-backup.txt",
        body: "notes backup file with old content",
      });

      const hits = await queryDocuments(client, "notes.txt", {});
      expect(hits[0].fileName).toBe("notes.txt");
    });
  });

  describe("relative path search", () => {
    it("finds document by path segment", async () => {
      const id = await indexDoc({
        fileName: "readme.txt",
        relativePath: "projects/alpha/readme.txt",
        body: "This is the readme for project alpha.",
      });

      const hits = await queryDocuments(client, "alpha", {});
      expect(hits.map((h) => h.id)).toContain(id);
    });
  });

  describe("prefix matching", () => {
    it("prefix on partial term finds full word", async () => {
      const id = await indexDoc({
        fileName: "document.txt",
        relativePath: "document.txt",
        body: "hello world greeting everyone",
      });

      const hits = await queryDocuments(client, "hel", {});
      expect(hits.map((h) => h.id)).toContain(id);
    });
  });

  describe("multi-word search", () => {
    it("multi-word finds documents with all terms", async () => {
      const id = await indexDoc({
        fileName: "meeting.txt",
        relativePath: "meeting.txt",
        body: "quarterly sales meeting notes from December",
      });
      await indexDoc({
        fileName: "other.txt",
        relativePath: "other.txt",
        body: "just some random content without relevant terms",
      });

      const hits = await queryDocuments(client, "quarterly sales", {});
      expect(hits).toHaveLength(1);
      expect(hits[0].id).toBe(id);
    });
  });

  describe("unsafe input handling", () => {
    it("does not crash on special characters", async () => {
      const hits = await queryDocuments(client, '@#$%^&*()"\'', {});
      expect(hits).toBeInstanceOf(Array);
    });

    it("does not crash on empty quotes", async () => {
      const hits = await queryDocuments(client, '""', {});
      expect(hits).toBeInstanceOf(Array);
    });

    it("handles single character search", async () => {
      await indexDoc({
        fileName: "a.txt",
        relativePath: "a.txt",
        body: "short content a",
      });
      const hits = await queryDocuments(client, "a", {});
      expect(hits).toBeInstanceOf(Array);
    });
  });

  describe("sort behavior", () => {
    it("empty search returns documents sorted by updated_at DESC", async () => {
      await indexDoc({
        fileName: "old.txt",
        relativePath: "old.txt",
        body: "older doc",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      await indexDoc({
        fileName: "new.txt",
        relativePath: "new.txt",
        body: "newer doc",
        updatedAt: "2025-06-01T00:00:00.000Z",
      });

      const hits = await queryDocuments(client, "", { sort: "recent" });
      expect(hits[0].fileName).toBe("new.txt");
      expect(hits[1].fileName).toBe("old.txt");
    });
  });

  describe("snippets", () => {
    it("returns search snippet for body match", async () => {
      await indexDoc({
        fileName: "doc.txt",
        relativePath: "doc.txt",
        body: "The quick brown fox jumps over the lazy dog in this document about animals.",
      });

      const hits = await queryDocuments(client, "fox", {});
      expect(hits).toHaveLength(1);
      expect(hits[0].searchSnippet).toBeTruthy();
      expect(hits[0].searchSnippet).toContain("<mark>");
      expect(hits[0].searchSnippet).toContain("fox");
    });
  });

  describe("filters with search", () => {
    it("folder filter works with search", async () => {
      const otherFolderId = crypto.randomUUID();
      await new FolderRepository(client).insertFolder({
        id: otherFolderId,
        rootPath: "/tmp/other-root",
        createdAt: new Date().toISOString(),
      });
      await indexDoc({
        fileName: "target.txt",
        relativePath: "target.txt",
        body: "unique search token alpha",
      });
      const otherDocId = crypto.randomUUID();
      const docs = new DocumentRepository(client);
      const search = new DocumentSearchRepository(client);
      await docs.upsertDocument({
        id: otherDocId,
        folderId: otherFolderId,
        absolutePath: "/tmp/other-root/target2.txt",
        relativePath: "target2.txt",
        fileName: "target2.txt",
        fileExtension: "txt",
        sizeBytes: 10,
        modifiedAt: new Date().toISOString(),
        parseStatus: "parsed_text",
        parseError: null,
        extractedText: "unique search token alpha",
        updatedAt: new Date().toISOString(),
      });
      await search.indexDocument(otherDocId, "target2.txt", "target2.txt", "unique search token alpha");

      const allHits = await queryDocuments(client, "alpha", {});
      expect(allHits).toHaveLength(2);

      const filteredHits = await queryDocuments(client, "alpha", { folderId });
      expect(filteredHits).toHaveLength(1);
      expect(filteredHits[0].fileName).toBe("target.txt");
    });
  });
});
