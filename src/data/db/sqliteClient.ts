import Database from "@tauri-apps/plugin-sql";

export interface SqlClient {
  execute(sql: string, params?: unknown[]): Promise<void>;
  select<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
}

class TauriSqlClient implements SqlClient {
  constructor(private readonly database: Database) {}

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    await this.database.execute(sql, params);
  }

  async select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.database.select<T[]>(sql, params);
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.select<T>(sql, params);
    return rows[0] ?? null;
  }
}

let tauriClientPromise: Promise<SqlClient> | null = null;
let e2eSqlJsPromise: Promise<SqlClient> | null = null;

export async function getAppSqlClient(): Promise<SqlClient> {
  if (import.meta.env.VITE_E2E_SQLITE === "1") {
    if (!e2eSqlJsPromise) {
      e2eSqlJsPromise = import("./sqljsClient").then((m) => m.createSqlJsClient());
    }
    return e2eSqlJsPromise;
  }

  if (!tauriClientPromise) {
    tauriClientPromise = Database.load("sqlite:stackdrop.db").then(
      (database) => new TauriSqlClient(database),
    );
  }
  return tauriClientPromise;
}
