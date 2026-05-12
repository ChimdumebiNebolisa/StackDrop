import { describe, expect, it } from "vitest";

import { runMigrations } from "../../data/db/migrate";
import { createTestSqlClient, type SqlClient } from "../../data/db/createTestSqlClient";
import { SearchRepository } from "../../data/search/searchRepository";
import { createNote } from "../../features/notes/services/createNote";
import { updateItemMetadata } from "../../domain/items/updateItemMetadata";

describe("reindex on title update", () => {
  it("updates FTS title after rename", async () => {
    const client: SqlClient = await createTestSqlClient();
    await runMigrations(client);
    const id = await createNote({ title: "Alpha title", body: "gamma body" }, client);
    await updateItemMetadata({ id, title: "Beta title" }, client);
    const search = new SearchRepository(client);
    const byBeta = await search.searchIndex("Beta", {});
    const byAlpha = await search.searchIndex("Alpha", {});
    expect(byBeta.some((row) => row.id === id)).toBe(true);
    expect(byAlpha.some((row) => row.id === id)).toBe(false);
  });
});
