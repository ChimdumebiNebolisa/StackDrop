import { beforeEach, describe, expect, it } from "vitest";

import { runMigrations } from "../../data/db/migrate";
import { createTestSqlClient, type SqlClient } from "../../data/db/createTestSqlClient";
import { CollectionRepository } from "../../data/repositories/collectionRepository";
import { ItemRepository } from "../../data/repositories/itemRepository";
import { assignCollection, removeCollectionAssignment } from "../../features/collections/services/manageCollection";
import { manageTags } from "../../features/tags/services/manageTags";
import { updateItemMetadata } from "../../domain/items/updateItemMetadata";

describe("STEP-04 organization services", () => {
  let client: SqlClient;
  let items: ItemRepository;
  let collections: CollectionRepository;

  beforeEach(async () => {
    client = await createTestSqlClient();
    await runMigrations(client);
    items = new ItemRepository(client);
    collections = new CollectionRepository(client);
    await items.insertItem({
      id: "org-item-1",
      type: "note",
      title: "Original title",
      isIndexed: true,
      parseStatus: "indexed",
      createdAt: "2026-05-12T00:00:00.000Z",
      updatedAt: "2026-05-12T00:00:00.000Z",
    });
  });

  it("updates item title", async () => {
    await updateItemMetadata({ id: "org-item-1", title: "Updated title" }, client);
    const item = await items.fetchItem("org-item-1");
    expect(item?.title).toBe("Updated title");
  });

  it("adds and removes tags", async () => {
    await manageTags("org-item-1", ["alpha", "beta"], client);
    let item = await items.fetchItem("org-item-1");
    expect(item?.tags).toEqual(expect.arrayContaining(["alpha", "beta"]));

    await manageTags("org-item-1", ["beta"], client);
    item = await items.fetchItem("org-item-1");
    expect(item?.tags).toEqual(["beta"]);
  });

  it("assigns and removes collection", async () => {
    const collectionId = await collections.createCollection("Inbox");
    await assignCollection("org-item-1", collectionId, client);
    let item = await items.fetchItem("org-item-1");
    expect(item?.collectionId).toBe(collectionId);

    await removeCollectionAssignment("org-item-1", client);
    item = await items.fetchItem("org-item-1");
    expect(item?.collectionId).toBeNull();
  });
});
