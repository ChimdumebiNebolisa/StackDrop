import { mkdtemp, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runMigrations } from "../../data/db/migrate";
import { createTestSqlClient, type SqlClient } from "../../data/db/createTestSqlClient";
import { ItemRepository } from "../../data/repositories/itemRepository";
import { importFile } from "../../features/files/services/importFile";
import { removeItem } from "../../domain/items/removeItem";

describe("STEP-04 removal behavior", () => {
  let client: SqlClient;
  let items: ItemRepository;
  let workingDir: string;

  beforeEach(async () => {
    client = await createTestSqlClient();
    await runMigrations(client);
    items = new ItemRepository(client);
    workingDir = await mkdtemp(join(tmpdir(), "stackdrop-step04-"));
  });

  afterEach(async () => {
    await rm(workingDir, { recursive: true, force: true });
  });

  it("removes from app index without deleting source file", async () => {
    const filePath = join(workingDir, "keep-me.txt");
    await writeFile(filePath, "still on disk after remove", "utf8");
    const { itemId } = await importFile({ filePath }, client);

    await removeItem(itemId, client);

    expect(await items.fetchItem(itemId)).toBeNull();
    await expect(access(filePath)).resolves.toBeUndefined();
  });
});
