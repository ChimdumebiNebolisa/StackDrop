import type { SqlClient } from "../../../data/db/sqliteClient";
import { FileRepository } from "../../../data/repositories/fileRepository";
import { ItemRepository } from "../../../data/repositories/itemRepository";
import { LinkRepository } from "../../../data/repositories/linkRepository";
import { NoteRepository } from "../../../data/repositories/noteRepository";

export async function getItemDetail(id: string, client: SqlClient) {
  const itemRepository = new ItemRepository(client);
  const item = await itemRepository.fetchItem(id);
  if (!item) return null;

  if (item.type === "note") {
    const note = await new NoteRepository(client).getNote(id);
    return { item, note };
  }
  if (item.type === "link") {
    const link = await new LinkRepository(client).getLink(id);
    return { item, link };
  }
  const file = await new FileRepository(client).getFile(id);
  return { item, file };
}
