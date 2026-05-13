import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseFileContent } from "../../domain/ingestion/parseFile";

describe("parseFileContent docx", () => {
  it("extracts text from a minimal docx fixture", async () => {
    const buf = await readFile(join(process.cwd(), "src/tests/fixtures/minimal.docx"));
    const result = await parseFileContent(".docx", new Uint8Array(buf));
    expect(result.status).toBe("parsed_text");
    expect(result.extractedText).toContain("stackdrop-docx-fixture-token");
  });
});
