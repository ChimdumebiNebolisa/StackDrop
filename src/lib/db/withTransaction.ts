import type { SqlClient } from "../../data/db/sqliteClient";

const SQLITE_BUSY_RETRY_DELAYS_MS = [75, 150, 300, 600, 1200];

function isSqliteBusy(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("database is locked") || message.includes("code: 517") || message.includes("SQLITE_BUSY");
}

async function executeWithBusyRetry(client: SqlClient, sql: string): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await client.execute(sql);
      return;
    } catch (error) {
      const delay = SQLITE_BUSY_RETRY_DELAYS_MS[attempt];
      if (!isSqliteBusy(error) || delay === undefined) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Runs `work` inside a single SQLite transaction (BEGIN / COMMIT / ROLLBACK).
 * Used to keep scan-related writes consistent on failure.
 */
export async function withTransaction(client: SqlClient, work: () => Promise<void>): Promise<void> {
  await executeWithBusyRetry(client, "BEGIN");
  try {
    await work();
    await executeWithBusyRetry(client, "COMMIT");
  } catch (error) {
    try {
      await executeWithBusyRetry(client, "ROLLBACK");
    } catch {
      // ignore secondary failure
    }
    throw error;
  }
}
