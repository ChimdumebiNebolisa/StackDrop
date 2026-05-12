import { beforeEach, describe, expect, it } from "vitest";

import { runMigrations } from "../../data/db/migrate";
import { createTestSqlClient, type SqlClient } from "../../data/db/createTestSqlClient";
import { CollectionRepository } from "../../data/repositories/collectionRepository";
import { FileRepository } from "../../data/repositories/fileRepository";
import { ItemRepository } from "../../data/repositories/itemRepository";
import { LinkRepository } from "../../data/repositories/linkRepository";
import { NoteRepository } from "../../data/repositories/noteRepository";
import { TagRepository } from "../../data/repositories/tagRepository";
import { SearchRepository } from "../../data/search/searchRepository";

describe("STEP-02 repositories", () => {
  let client: SqlClient;
  let items: ItemRepository;
  let notes: NoteRepository;
  let links: LinkRepository;
  let files: FileRepository;
  let tags: TagRepository;
  let collections: CollectionRepository;
  let search: SearchRepository;

  beforeEach(async () => {
    client = await createTestSqlClient();
    await runMigrations(client);
    items = new ItemRepository(client);
    notes = new NoteRepository(client);
    links = new LinkRepository(client);
    files = new FileRepository(client);
    tags = new TagRepository(client);
    collections = new CollectionRepository(client);
    search = new SearchRepository(client);
  });

  it("inserts and fetches item records", async () => {
    await items.insertItem({
      id: "item-note-1",
      type: "note",
      title: "Test note",
      isIndexed: true,
      parseStatus: "indexed",
      createdAt: "2026-05-12T00:00:00.000Z",
      updatedAt: "2026-05-12T00:00:00.000Z",
    });
    const item = await items.fetchItem("item-note-1");
    expect(item?.title).toBe("Test note");
    expect(item?.type).toBe("note");
  });

  it("upserts note, link, and file metadata records", async () => {
    await items.insertItem({
      id: "item-file-1",
      type: "file",
      title: "Spec",
      sourcePath: "C:/tmp/spec.md",
      isIndexed: true,
      parseStatus: "indexed",
      createdAt: "2026-05-12T00:00:00.000Z",
      updatedAt: "2026-05-12T00:00:00.000Z",
    });

    await notes.upsertNote("item-file-1", "note body");
    await links.upsertLink("item-file-1", "https://example.com");
    await files.upsertFile("item-file-1", "C:/tmp/spec.md", ".md", "hello search");

    expect((await notes.getNote("item-file-1"))?.body).toBe("note body");
    expect((await links.getLink("item-file-1"))?.url).toBe("https://example.com");
    expect((await files.getFile("item-file-1"))?.fileExtension).toBe(".md");
  });

  it("supports tag upsert and tag-filtered fetch", async () => {
    await items.insertItem({
      id: "item-tag-1",
      type: "note",
      title: "Tag me",
      isIndexed: true,
      parseStatus: "indexed",
      createdAt: "2026-05-12T00:00:00.000Z",
      updatedAt: "2026-05-12T00:00:00.000Z",
    });
    await tags.upsertTags("item-tag-1", ["urgent", "research"]);
    let filtered = await items.fetchItems({ tag: "urgent" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.tags).toContain("urgent");

    await tags.upsertTags("item-tag-1", ["research"]);
    filtered = await items.fetchItems({ tag: "urgent" });
    expect(filtered).toHaveLength(0);
  });

  it("supports collection set and clear", async () => {
    await items.insertItem({
      id: "item-col-1",
      type: "note",
      title: "Collections",
      isIndexed: false,
      parseStatus: "not_applicable",
      createdAt: "2026-05-12T00:00:00.000Z",
      updatedAt: "2026-05-12T00:00:00.000Z",
    });
    const collectionId = await collections.createCollection("Inbox");
    await collections.setCollection("item-col-1", collectionId);
    let item = await items.fetchItem("item-col-1");
    expect(item?.collectionId).toBe(collectionId);
    await collections.clearCollection("item-col-1");
    item = await items.fetchItem("item-col-1");
    expect(item?.collectionId).toBeNull();
  });

  it("indexes and searches with FTS5", async () => {
    await items.insertItem({
      id: "item-search-1",
      type: "note",
      title: "SQLite docs",
      isIndexed: true,
      parseStatus: "indexed",
      createdAt: "2026-05-11T00:00:00.000Z",
      updatedAt: "2026-05-11T00:00:00.000Z",
    });
    await search.indexItem("item-search-1", "SQLite docs", "fts5 supports full text query");
    const results = await search.searchIndex("fts5");
    expect(results.map((result) => result.id)).toContain("item-search-1");
  });

  it("deletes item and cascades related records", async () => {
    await items.insertItem({
      id: "item-delete-1",
      type: "file",
      title: "Delete me",
      sourcePath: "C:/tmp/delete.txt",
      isIndexed: true,
      parseStatus: "indexed",
      createdAt: "2026-05-12T00:00:00.000Z",
      updatedAt: "2026-05-12T00:00:00.000Z",
    });
    await files.upsertFile("item-delete-1", "C:/tmp/delete.txt", ".txt", "delete me");
    await search.indexItem("item-delete-1", "Delete me", "delete me");

    await items.deleteItem("item-delete-1");
    expect(await items.fetchItem("item-delete-1")).toBeNull();
    expect(await files.getFile("item-delete-1")).toBeNull();
    expect(await search.searchIndex("delete")).toHaveLength(0);
  });

  it("confirms fts5 module is available", async () => {
    const row = await client.get<{ count: number }>(
      "SELECT count(*) as count FROM item_search WHERE item_search MATCH ?",
      ["nonexistenttoken"],
    );
    expect(row?.count).toBe(0);
  });
});
