import initSqlJs from "sql.js-fts5";

import type { SqlClient } from "./sqliteClient";

import sqlWasmUrl from "sql.js-fts5/dist/sql-wasm.wasm?url";

type SqlJsDatabase = import("sql.js").Database;
type SqlValue = import("sql.js").SqlValue;

function toSqlValues(params: unknown[]): SqlValue[] {
  return params.map((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "bigint") return String(value);
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }
    if (value instanceof Uint8Array) return value;
    return String(value);
  }) as SqlValue[];
}

class SqlJsClient implements SqlClient {
  constructor(private readonly db: SqlJsDatabase) {}

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    this.db.run(sql, toSqlValues(params));
  }

  async select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    try {
      if (params.length > 0) {
        stmt.bind(toSqlValues(params));
      }
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
      return results;
    } finally {
      stmt.free();
    }
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.select<T>(sql, params);
    return rows[0] ?? null;
  }
}

export async function createSqlJsClient(): Promise<SqlClient> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => (file.endsWith(".wasm") ? sqlWasmUrl : file),
  });
  const db = new SQL.Database();
  return new SqlJsClient(db);
}
