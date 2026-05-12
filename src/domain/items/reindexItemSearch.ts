import type { SqlClient } from "../../data/db/sqliteClient";
import { FileRepository } from "../../data/repositories/fileRepository";
import { ItemRepository } from "../../data/repositories/itemRepository";
import { LinkRepository } from "../../data/repositories/linkRepository";
import { NoteRepository } from "../../data/repositories/noteRepository";
import { SearchRepository } from "../../data/search/searchRepository";

export async function reindexItemSearch(itemId: string, client: SqlClient): Promise<void> {
  const itemRepository = new ItemRepository(client);
  const item = await itemRepository.fetchItem(itemId);
  if (!item) return;
  if (item.type === "file" && !item.isIndexed) {
    await new SearchRepository(client).removeItemFromIndex(itemId);
    return;
  }

  const searchRepository = new SearchRepository(client);
  if (item.type === "note") {
    const note = await new NoteRepository(client).getNote(itemId);
    await searchRepository.indexItem(itemId, item.title, note?.body ?? "");
    return;
  }
  if (item.type === "link") {
    const link = await new LinkRepository(client).getLink(itemId);
    await searchRepository.indexItem(itemId, item.title, link?.url ?? "");
    return;
  }
  const file = await new FileRepository(client).getFile(itemId);
  await searchRepository.indexItem(itemId, item.title, file?.extractedText ?? "");
}
