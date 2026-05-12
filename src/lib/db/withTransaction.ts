import type { SqlClient } from "../../data/db/sqliteClient";

/**
 * Runs `work` inside a single SQLite transaction (BEGIN / COMMIT / ROLLBACK).
 * Used to keep scan-related writes consistent on failure.
 */
export async function withTransaction(client: SqlClient, work: () => Promise<void>): Promise<void> {
  await client.execute("BEGIN");
  try {
    await work();
    await client.execute("COMMIT");
  } catch (error) {
    try {
      await client.execute("ROLLBACK");
    } catch {
      // ignore secondary failure
    }
    throw error;
  }
}
