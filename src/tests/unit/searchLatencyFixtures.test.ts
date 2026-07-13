import { describe, expect, it } from "vitest";

import { createTestSqlClient } from "../../data/db/createTestSqlClient";
import { runMigrations } from "../../data/db/migrate";
import { DocumentRepository } from "../../data/repositories/documentRepository";
import { FolderRepository } from "../../data/repositories/folderRepository";
import { DocumentSearchRepository } from "../../data/search/documentSearchRepository";
import { queryDocuments } from "../../features/documents/services/queryDocuments";
import { createSearchLatencyFixtureCorpus, toDocumentUpsertInput } from "../fixtures/searchLatencyFixtures";

async function seedLatencyCorpus(size = 240) {
  const client = await createTestSqlClient();
  await runMigrations(client);

  const corpus = createSearchLatencyFixtureCorpus(size);
  const folderId = "latency-fixture-folder";
  const documents = new DocumentRepository(client);
  const search = new DocumentSearchRepository(client);

  await new FolderRepository(client).insertFolder({
    id: folderId,
    rootPath: corpus.rootPath,
    createdAt: "2025-01-01T00:00:00.000Z",
  });

  for (const document of corpus.documents) {
    await documents.upsertDocument(toDocumentUpsertInput(folderId, document));
    await search.indexDocument(document.id, document.fileName, document.relativePath, document.body);
  }

  return { client, corpus };
}

describe("search latency fixtures", () => {
  it("builds a deterministic representative corpus", () => {
    const first = createSearchLatencyFixtureCorpus(12);
    const second = createSearchLatencyFixtureCorpus(12);

    expect(first).toEqual(second);
    expect(first.documents).toHaveLength(17);
    expect(first.documents.map((document) => document.id)).toEqual(
      Array.from(new Set(first.documents.map((document) => document.id))),
    );
  });

  it("exercises exact filename, prefix, path, body, and fallback search paths", async () => {
    const { client, corpus } = await seedLatencyCorpus();

    const exactFilenameHits = await queryDocuments(client, corpus.queries.exactFilename, {});
    expect(exactFilenameHits[0].id).toBe("latency-doc-exact-filename");

    const prefixHits = await queryDocuments(client, corpus.queries.filenamePrefix, {});
    expect(prefixHits.map((hit) => hit.id)).toContain("latency-doc-prefix");

    const pathHits = await queryDocuments(client, corpus.queries.relativePath, {});
    expect(pathHits.map((hit) => hit.id)).toContain("latency-doc-path");

    const bodyHits = await queryDocuments(client, corpus.queries.bodyOnly, {});
    expect(bodyHits.map((hit) => hit.id)).toContain("latency-doc-body");
    expect(bodyHits.find((hit) => hit.id === "latency-doc-body")?.searchSnippet).toContain("<mark>");

    const fallbackHits = await queryDocuments(client, corpus.queries.fallbackSubstring, {});
    expect(fallbackHits.map((hit) => hit.id)).toContain("latency-doc-fallback");
    expect(fallbackHits.find((hit) => hit.id === "latency-doc-fallback")?.searchSnippet).toBeNull();
  });
});
