import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseFileContent } from "../../domain/ingestion/parseFile";

describe("parseFileContent pdf", () => {
  it("extracts text from a text-layer PDF as parsed_text", async () => {
    const buf = await readFile(join(process.cwd(), "src/tests/fixtures/text-layer.pdf"));
    const result = await parseFileContent(".pdf", new Uint8Array(buf));
    expect(result.status).toBe("parsed_text");
    expect(result.extractedText).toContain("STACKDROP_PDF_TEXT_TOKEN_20260514");
  });

  it("marks malformed PDFs as parse_failed", async () => {
    const buf = await readFile(join(process.cwd(), "src/tests/fixtures/broken.pdf"));
    const result = await parseFileContent(".pdf", new Uint8Array(buf));
    expect(result.status).toBe("parse_failed");
  });
});
