import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runMigrations } from "../../data/db/migrate";
import { createTestSqlClient, type SqlClient } from "../../data/db/createTestSqlClient";
import { ItemRepository } from "../../data/repositories/itemRepository";
import { LinkRepository } from "../../data/repositories/linkRepository";
import { NoteRepository } from "../../data/repositories/noteRepository";
import { SearchRepository } from "../../data/search/searchRepository";
import { importFile } from "../../features/files/services/importFile";
import { saveLink } from "../../features/links/services/saveLink";
import { createNote } from "../../features/notes/services/createNote";

const minimalPdf = `%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 18 Tf
72 72 Td
(StackDrop PDF Search Text) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000010 00000 n
0000000065 00000 n
0000000122 00000 n
0000000248 00000 n
0000000340 00000 n
trailer
<< /Root 1 0 R /Size 6 >>
startxref
410
%%EOF`;

describe("STEP-03 capture services", () => {
  let client: SqlClient;
  let itemRepository: ItemRepository;
  let noteRepository: NoteRepository;
  let linkRepository: LinkRepository;
  let searchRepository: SearchRepository;
  let workingDir: string;

  beforeEach(async () => {
    client = await createTestSqlClient();
    await runMigrations(client);
    itemRepository = new ItemRepository(client);
    noteRepository = new NoteRepository(client);
    linkRepository = new LinkRepository(client);
    searchRepository = new SearchRepository(client);
    workingDir = await mkdtemp(join(tmpdir(), "stackdrop-step03-"));
  });

  afterEach(async () => {
    await rm(workingDir, { recursive: true, force: true });
  });

  it("createNote persists note and indexes content", async () => {
    const itemId = await createNote(
      { title: "Meeting Notes", body: "alpha note query text", tags: ["work"] },
      client,
    );
    const note = await noteRepository.getNote(itemId);
    const item = await itemRepository.fetchItem(itemId);
    const results = await searchRepository.searchIndex("alpha");

    expect(note?.body).toContain("alpha note query text");
    expect(item?.type).toBe("note");
    expect(results.some((result) => result.id === itemId)).toBe(true);
  });

  it("saveLink persists link record", async () => {
    const itemId = await saveLink({ title: "StackDrop", url: "https://example.com" }, client);
    const link = await linkRepository.getLink(itemId);
    const item = await itemRepository.fetchItem(itemId);
    expect(link?.url).toBe("https://example.com");
    expect(item?.sourceUrl).toBe("https://example.com");
  });

  it("importFile indexes txt file", async () => {
    const filePath = join(workingDir, "sample.txt");
    await writeFile(filePath, "txt content for stackdrop search", "utf8");
    const result = await importFile({ filePath }, client);
    const item = await itemRepository.fetchItem(result.itemId);
    const search = await searchRepository.searchIndex("stackdrop");
    expect(result.parseStatus).toBe("indexed");
    expect(item?.parseStatus).toBe("indexed");
    expect(search.some((entry) => entry.id === result.itemId)).toBe(true);
  });

  it("importFile indexes md file", async () => {
    const filePath = join(workingDir, "sample.md");
    await writeFile(filePath, "# Header\nmarkdown indexed body", "utf8");
    const result = await importFile({ filePath }, client);
    const item = await itemRepository.fetchItem(result.itemId);
    const search = await searchRepository.searchIndex("markdown");
    expect(result.parseStatus).toBe("indexed");
    expect(item?.parseStatus).toBe("indexed");
    expect(search.some((entry) => entry.id === result.itemId)).toBe(true);
  });

  it("importFile indexes pdf file", async () => {
    const filePath = join(workingDir, "sample.pdf");
    await writeFile(filePath, minimalPdf, "binary");
    const result = await importFile({ filePath }, client);
    const item = await itemRepository.fetchItem(result.itemId);
    const search = await searchRepository.searchIndex("StackDrop");
    expect(result.parseStatus).toBe("indexed");
    expect(item?.parseStatus).toBe("indexed");
    expect(search.some((entry) => entry.id === result.itemId)).toBe(true);
  });

  it("importFile stores item when parse fails and keeps it out of index", async () => {
    const filePath = join(workingDir, "broken.pdf");
    await writeFile(filePath, "not-a-real-pdf", "utf8");
    const result = await importFile({ filePath }, client);
    const item = await itemRepository.fetchItem(result.itemId);
    const search = await searchRepository.searchIndex("brokenpdftoken");
    expect(result.parseStatus).toBe("failed");
    expect(result.isIndexed).toBe(false);
    expect(item?.parseStatus).toBe("failed");
    expect(item?.isIndexed).toBe(false);
    expect(search.some((entry) => entry.id === result.itemId)).toBe(false);
  });
});
