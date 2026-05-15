import Database from "@tauri-apps/plugin-sql";

const SQLITE_BUSY_RETRY_DELAYS_MS = [100, 250, 500, 1000, 2000, 4000, 8000];

export interface SqlClient {
  execute(sql: string, params?: unknown[]): Promise<void>;
  select<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
}

function isSqliteBusy(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("database is locked") || message.includes("code: 517") || message.includes("SQLITE_BUSY");
}

async function withBusyRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const delay = SQLITE_BUSY_RETRY_DELAYS_MS[attempt];
      if (!isSqliteBusy(error) || delay === undefined) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

class TauriSqlClient implements SqlClient {
  constructor(private readonly database: Database) {}

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    await withBusyRetry(() => this.database.execute(sql, params));
  }

  async select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return withBusyRetry(() => this.database.select<T[]>(sql, params));
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
