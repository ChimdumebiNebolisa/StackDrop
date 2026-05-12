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

/** True when `indexed_documents` already enforces only txt / pdf / docx. */
function isIndexedDocumentsSchemaFinal(sql: string): boolean {
  return (
    sql.includes("'txt'") &&
    sql.includes("'pdf'") &&
    sql.includes("'docx'") &&
    !sql.includes("'md'")
  );
}

/**
 * Normalizes `indexed_documents` to the canonical extension set (`txt`, `pdf`, `docx`),
 * drops rows for other extensions, and rebuilds the table + indexes when the live CHECK
 * predates that shape (e.g. older builds that allowed `md` or omitted `docx`).
 */
export async function migrateIndexedDocumentsSchema(client: SqlClient): Promise<void> {
  const row = await client.get<{ sql: string | null }>(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='indexed_documents' LIMIT 1",
  );
  if (!row?.sql) return;
  if (isIndexedDocumentsSchemaFinal(row.sql)) return;

  await client.execute("PRAGMA foreign_keys=OFF");
  await client.execute(
    `DELETE FROM document_search WHERE document_id IN (
       SELECT id FROM indexed_documents WHERE file_extension NOT IN ('txt','pdf','docx')
     )`,
  );
  await client.execute(
    `DELETE FROM indexed_documents WHERE file_extension NOT IN ('txt','pdf','docx')`,
  );

  await client.execute(`CREATE TABLE indexed_documents__mig (
    id TEXT PRIMARY KEY,
    folder_id TEXT NOT NULL REFERENCES indexed_folders(id) ON DELETE CASCADE,
    absolute_path TEXT NOT NULL UNIQUE,
    relative_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_extension TEXT NOT NULL CHECK (file_extension IN ('txt', 'pdf', 'docx')),
    size_bytes INTEGER NOT NULL,
    modified_at TEXT NOT NULL,
    parse_status TEXT NOT NULL CHECK (parse_status IN ('indexed', 'failed')),
    parse_error TEXT,
    extracted_text TEXT,
    updated_at TEXT NOT NULL
  )`);
  await client.execute(`INSERT INTO indexed_documents__mig SELECT * FROM indexed_documents`);
  await client.execute("DROP TABLE indexed_documents");
  await client.execute("ALTER TABLE indexed_documents__mig RENAME TO indexed_documents");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_documents_folder ON indexed_documents(folder_id)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_documents_ext ON indexed_documents(file_extension)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_documents_parse ON indexed_documents(parse_status)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_documents_updated ON indexed_documents(updated_at DESC)");
  await client.execute("PRAGMA foreign_keys=ON");
}

export async function runMigrations(client?: SqlClient): Promise<void> {
  const db = client ?? (await getAppSqlClient());
  await dropLegacyV0IfPresent(db);
  const statements = splitSqlStatements(schemaSql);
  for (const statement of statements) {
    await db.execute(statement);
  }
  await migrateIndexedDocumentsSchema(db);
}
