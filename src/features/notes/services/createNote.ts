import { ItemRepository } from "../../../data/repositories/itemRepository";
import { NoteRepository } from "../../../data/repositories/noteRepository";
import { TagRepository } from "../../../data/repositories/tagRepository";
import { SearchRepository } from "../../../data/search/searchRepository";
import type { SqlClient } from "../../../data/db/sqliteClient";
import { normalizeNote } from "../../../domain/ingestion/normalizeNote";

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `item_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export interface CreateNoteInput {
  title: string;
  body: string;
  tags?: string[];
  collectionId?: string | null;
}

export async function createNote(input: CreateNoteInput, client: SqlClient): Promise<string> {
  const normalized = normalizeNote(input);
  const itemId = createId();
  const now = new Date().toISOString();

  const itemRepository = new ItemRepository(client);
  const noteRepository = new NoteRepository(client);
  const tagRepository = new TagRepository(client);
  const searchRepository = new SearchRepository(client);

  await itemRepository.insertItem({
    id: itemId,
    type: "note",
    title: normalized.title,
    isIndexed: true,
    parseStatus: "indexed",
    createdAt: now,
    updatedAt: now,
    collectionId: input.collectionId ?? null,
  });
  await noteRepository.upsertNote(itemId, normalized.body);
  await tagRepository.upsertTags(itemId, input.tags ?? []);
  await searchRepository.indexItem(itemId, normalized.title, normalized.body);

  return itemId;
}
