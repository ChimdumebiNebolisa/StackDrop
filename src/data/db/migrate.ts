import schemaSql from "./schema.sql?raw";
import type { SqlClient } from "./sqliteClient";
import { getAppSqlClient } from "./sqliteClient";

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

const LEGACY_V0_DROPS = [
  "DROP TABLE IF EXISTS item_search",
  "DROP TABLE IF EXISTS item_tags",
  "DROP TABLE IF EXISTS tags",
  "DROP TABLE IF EXISTS note_contents",
  "DROP TABLE IF EXISTS link_metadata",
  "DROP TABLE IF EXISTS file_metadata",
  "DROP TABLE IF EXISTS items",
  "DROP TABLE IF EXISTS collections",
];

async function dropLegacyV0IfPresent(client: SqlClient): Promise<void> {
  const row = await client.get<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'items' LIMIT 1",
  );
  if (!row) return;
  for (const sql of LEGACY_V0_DROPS) {
    await client.execute(sql);
  }
}

export async function runMigrations(client?: SqlClient): Promise<void> {
  const db = client ?? (await getAppSqlClient());
  await dropLegacyV0IfPresent(db);
  const statements = splitSqlStatements(schemaSql);
  for (const statement of statements) {
    await db.execute(statement);
  }
}
