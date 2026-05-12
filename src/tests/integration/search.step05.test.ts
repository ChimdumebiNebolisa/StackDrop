import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runMigrations } from "../../data/db/migrate";
import { createTestSqlClient, type SqlClient } from "../../data/db/createTestSqlClient";
import { ItemRepository } from "../../data/repositories/itemRepository";
import { searchItems } from "../../domain/search/searchItems";
import { importFile } from "../../features/files/services/importFile";
import { saveLink } from "../../features/links/services/saveLink";
import { createNote } from "../../features/notes/services/createNote";

describe("STEP-05 search and browse services", () => {
  let client: SqlClient;
  let items: ItemRepository;
  let workingDir: string;

  beforeEach(async () => {
    client = await createTestSqlClient();
    await runMigrations(client);
    items = new ItemRepository(client);
    workingDir = await mkdtemp(join(tmpdir(), "stackdrop-step05-"));
  });

  afterEach(async () => {
    await rm(workingDir, { recursive: true, force: true });
  });

  it("matches note text in full-text search", async () => {
    const noteId = await createNote(
      { title: "Roadmap", body: "searchable note body phrase" },
      client,
    );
    const results = await searchItems("phrase", {}, client);
    expect(results.map((item) => item.id)).toContain(noteId);
  });

  it("matches extracted file text in full-text search", async () => {
    const filePath = join(workingDir, "search.md");
    await writeFile(filePath, "file extracted uniquekey", "utf8");
    const fileImport = await importFile({ filePath }, client);
    const results = await searchItems("uniquekey", {}, client);
    expect(results.map((item) => item.id)).toContain(fileImport.itemId);
  });

  it("matches link metadata only", async () => {
    const linkId = await saveLink(
      { title: "Docs Home", url: "https://docs.example.com/path" },
      client,
    );
    const titleMatches = await searchItems("Docs", {}, client);
    const bodyMatches = await searchItems("thisstringdoesnotexistremotely", {}, client);
    expect(titleMatches.map((item) => item.id)).toContain(linkId);
    expect(bodyMatches.map((item) => item.id)).not.toContain(linkId);
  });

  it("handles hyphenated search terms without returning stale or remote body matches", async () => {
    const linkId = await saveLink(
      { title: "Metadata Link", url: "https://example.com/metadata-only" },
      client,
    );
    const metadataMatches = await searchItems("metadata-only", {}, client);
    const remoteBodyMatches = await searchItems("remote-webpage-body-token", {}, client);

    expect(metadataMatches.map((item) => item.id)).toContain(linkId);
    expect(remoteBodyMatches.map((item) => item.id)).not.toContain(linkId);
    expect(remoteBodyMatches).toHaveLength(0);
  });

  it("filters by item type", async () => {
    await createNote({ title: "Type note", body: "typed text" }, client);
    await saveLink({ title: "Type link", url: "https://example.com" }, client);
    const results = await searchItems("Type", { type: "note" }, client);
    expect(results.every((result) => result.type === "note")).toBe(true);
  });

  it("filters by tag", async () => {
    await createNote({ title: "Tagged", body: "tag search body", tags: ["focus"] }, client);
    await createNote({ title: "Other", body: "tag search body", tags: ["other"] }, client);
    const results = await searchItems("tag", { tag: "focus" }, client);
    expect(results).toHaveLength(1);
    expect(results[0]?.tags).toContain("focus");
  });

  it("supports relevance and recency sorting", async () => {
    const id1 = await createNote({ title: "Sort A", body: "alpha alpha alpha beta" }, client);
    const id2 = await createNote({ title: "Sort B", body: "alpha beta" }, client);
    const id3 = await createNote({ title: "Sort C", body: "alpha", tags: ["x"] }, client);

    // Force recency differences.
    await items.updateItem({
      ...(await items.fetchItem(id1))!,
      updatedAt: "2026-05-10T00:00:00.000Z",
    });
    await items.updateItem({
      ...(await items.fetchItem(id2))!,
      updatedAt: "2026-05-11T00:00:00.000Z",
    });
    await items.updateItem({
      ...(await items.fetchItem(id3))!,
      updatedAt: "2026-05-12T00:00:00.000Z",
    });

    const relevance = await searchItems("alpha", { sort: "relevance" }, client);
    const recent = await searchItems("alpha", { sort: "recent" }, client);
    expect(relevance.map((item) => item.id).join(",")).not.toBe(
      recent.map((item) => item.id).join(","),
    );
  });
});
