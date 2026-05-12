import BetterSqlite3 from "better-sqlite3";

import type { SqlClient } from "./sqliteClient";

export type { SqlClient } from "./sqliteClient";

class BetterSqliteClient implements SqlClient {
  constructor(private readonly database: BetterSqlite3.Database) {}

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    this.database.prepare(sql).run(...params);
  }

  async select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.database.prepare(sql).all(...params) as T[];
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const row = this.database.prepare(sql).get(...params) as T | undefined;
    return row ?? null;
  }
}

export async function createTestSqlClient(fileName = ":memory:"): Promise<SqlClient> {
  const database = new BetterSqlite3(fileName);
  database.pragma("foreign_keys = ON");
  return new BetterSqliteClient(database);
}
