import { ItemRepository } from "../../../data/repositories/itemRepository";
import { LinkRepository } from "../../../data/repositories/linkRepository";
import { TagRepository } from "../../../data/repositories/tagRepository";
import { SearchRepository } from "../../../data/search/searchRepository";
import type { SqlClient } from "../../../data/db/sqliteClient";
import { normalizeLink } from "../../../domain/ingestion/normalizeLink";

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `item_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export interface SaveLinkInput {
  title: string;
  url: string;
  tags?: string[];
  collectionId?: string | null;
}

export async function saveLink(input: SaveLinkInput, client: SqlClient): Promise<string> {
  const normalized = normalizeLink(input);
  const itemId = createId();
  const now = new Date().toISOString();

  const itemRepository = new ItemRepository(client);
  const linkRepository = new LinkRepository(client);
  const tagRepository = new TagRepository(client);
  const searchRepository = new SearchRepository(client);

  await itemRepository.insertItem({
    id: itemId,
    type: "link",
    title: normalized.title,
    sourceUrl: normalized.url,
    previewText: normalized.url,
    isIndexed: true,
    parseStatus: "not_applicable",
    createdAt: now,
    updatedAt: now,
    collectionId: input.collectionId ?? null,
  });
  await linkRepository.upsertLink(itemId, normalized.url);
  await tagRepository.upsertTags(itemId, input.tags ?? []);
  await searchRepository.indexItem(itemId, normalized.title, normalized.url);

  return itemId;
}
