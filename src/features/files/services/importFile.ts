import type { SqlClient } from "../../../data/db/sqliteClient";
import { FileRepository } from "../../../data/repositories/fileRepository";
import { ItemRepository } from "../../../data/repositories/itemRepository";
import { TagRepository } from "../../../data/repositories/tagRepository";
import { SearchRepository } from "../../../data/search/searchRepository";
import { parseFileContent } from "../../../domain/ingestion/parseFile";
import { fileBasename, fileExtension } from "../../../lib/path/sourcePaths";
import { readSourceFileBytes } from "./readSourceFile";

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `item_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export interface ImportFileInput {
  filePath: string;
  title?: string;
  tags?: string[];
  collectionId?: string | null;
}

export interface ImportFileResult {
  itemId: string;
  parseStatus: "indexed" | "failed";
  isIndexed: boolean;
  parseError?: string;
}

export async function importFile(
  input: ImportFileInput,
  client: SqlClient,
): Promise<ImportFileResult> {
  const itemId = createId();
  const now = new Date().toISOString();
  const title = input.title?.trim() || fileBasename(input.filePath);
  const extension = fileExtension(input.filePath);
  const bytes = await readSourceFileBytes(input.filePath);
  const parseResult = await parseFileContent(extension, bytes);

  const itemRepository = new ItemRepository(client);
  const fileRepository = new FileRepository(client);
  const tagRepository = new TagRepository(client);
  const searchRepository = new SearchRepository(client);

  await itemRepository.insertItem({
    id: itemId,
    type: "file",
    title,
    sourcePath: input.filePath,
    previewText: parseResult.status === "indexed" ? parseResult.extractedText ?? "" : null,
    isIndexed: parseResult.status === "indexed",
    parseStatus: parseResult.status,
    createdAt: now,
    updatedAt: now,
    collectionId: input.collectionId ?? null,
  });

  await fileRepository.upsertFile(
    itemId,
    input.filePath,
    extension,
    parseResult.status === "indexed" ? parseResult.extractedText ?? "" : null,
  );
  await tagRepository.upsertTags(itemId, input.tags ?? []);

  if (parseResult.status === "indexed") {
    await searchRepository.indexItem(itemId, title, parseResult.extractedText ?? "");
  }

  return {
    itemId,
    parseStatus: parseResult.status,
    isIndexed: parseResult.status === "indexed",
    parseError: parseResult.error,
  };
}
