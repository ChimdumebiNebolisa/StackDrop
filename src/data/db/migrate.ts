import schemaSql from "./schema.sql?raw";
import type { SqlClient } from "./sqliteClient";
import { getAppSqlClient } from "./sqliteClient";

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export async function runMigrations(client?: SqlClient): Promise<void> {
  const db = client ?? (await getAppSqlClient());
  const statements = splitSqlStatements(schemaSql);
  for (const statement of statements) {
    await db.execute(statement);
  }
}
