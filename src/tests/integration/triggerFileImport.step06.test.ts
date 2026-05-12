import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

import { runMigrations } from "../../data/db/migrate";
import { createTestSqlClient, type SqlClient } from "../../data/db/createTestSqlClient";
import { ItemRepository } from "../../data/repositories/itemRepository";
import { triggerFileImport } from "../../features/files/services/triggerFileImport";

const mockInvoke = vi.mocked(invoke);

describe("STEP-06 triggerFileImport wiring", () => {
  let client: SqlClient;
  let workDir: string;
  let txtPath: string;

  beforeAll(async () => {
    client = await createTestSqlClient();
    await runMigrations(client);
    workDir = await mkdtemp(join(tmpdir(), "stackdrop-step06-"));
    txtPath = join(workDir, "picked.txt");
    await writeFile(txtPath, "dialog import body", "utf8");
  });

  afterAll(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("passes dialog path into importFile and persists item", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "open_file_dialog") return txtPath;
      return null;
    });
    const result = await triggerFileImport(client);
    expect(result).not.toBeNull();
    expect(result?.parseStatus).toBe("indexed");
    const item = await new ItemRepository(client).fetchItem(result!.itemId);
    expect(item?.type).toBe("file");
  });

  it("returns null when dialog is cancelled", async () => {
    mockInvoke.mockResolvedValueOnce(null);
    const result = await triggerFileImport(client);
    expect(result).toBeNull();
  });
});
