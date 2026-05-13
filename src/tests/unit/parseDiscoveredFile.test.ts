import { describe, expect, it, vi, beforeEach } from "vitest";

import { parseDiscoveredFile } from "../../features/folders/services/parseDiscoveredFile";
import { parseFileContent } from "../../domain/ingestion/parseFile";
import { invokeExtractDocTextUnderRoot, invokeOcrPdfTextUnderRoot } from "../../features/folders/services/tauriFolderFs";

vi.mock("../../domain/ingestion/parseFile", () => ({
  parseFileContent: vi.fn(),
}));

vi.mock("../../features/folders/services/tauriFolderFs", () => ({
  invokeOcrPdfTextUnderRoot: vi.fn(),
  invokeExtractDocTextUnderRoot: vi.fn(),
}));

describe("parseDiscoveredFile", () => {
  beforeEach(() => {
    vi.mocked(parseFileContent).mockReset();
    vi.mocked(invokeOcrPdfTextUnderRoot).mockReset();
    vi.mocked(invokeExtractDocTextUnderRoot).mockReset();
  });

  it("uses OCR fallback for near-empty PDF text", async () => {
    vi.mocked(parseFileContent).mockResolvedValue({
      status: "parsed_text",
      extractedText: " ",
    });
    vi.mocked(invokeOcrPdfTextUnderRoot).mockResolvedValue("text from local OCR");

    const result = await parseDiscoveredFile({
      rootPath: "/root",
      absolutePath: "/root/a.pdf",
      extension: "pdf",
      bytes: new Uint8Array([1, 2, 3]),
    });

    expect(result.parseStatus).toBe("parsed_ocr");
    expect(result.extractedText).toContain("local OCR");
  });

  it("keeps parsed text when OCR fallback fails but text parser returned content", async () => {
    vi.mocked(parseFileContent).mockResolvedValue({
      status: "parsed_text",
      extractedText: "tiny",
    });
    vi.mocked(invokeOcrPdfTextUnderRoot).mockRejectedValue(new Error("ocr binary missing"));

    const result = await parseDiscoveredFile({
      rootPath: "/root",
      absolutePath: "/root/a.pdf",
      extension: "pdf",
      bytes: new Uint8Array([1, 2, 3]),
    });

    expect(result.parseStatus).toBe("parsed_text");
    expect(result.extractedText).toBe("tiny");
  });

  it("extracts legacy .doc text through the local extractor", async () => {
    vi.mocked(invokeExtractDocTextUnderRoot).mockResolvedValue("legacy doc body");

    const result = await parseDiscoveredFile({
      rootPath: "/root",
      absolutePath: "/root/a.doc",
      extension: "doc",
      bytes: new Uint8Array([1, 2, 3]),
    });

    expect(result.parseStatus).toBe("parsed_text");
    expect(result.extractedText).toContain("legacy doc");
    expect(parseFileContent).not.toHaveBeenCalled();
  });

  it("marks parse_failed when legacy .doc extraction fails", async () => {
    vi.mocked(invokeExtractDocTextUnderRoot).mockRejectedValue(new Error("antiword missing"));

    const result = await parseDiscoveredFile({
      rootPath: "/root",
      absolutePath: "/root/a.doc",
      extension: "doc",
      bytes: new Uint8Array([1, 2, 3]),
    });

    expect(result.parseStatus).toBe("parse_failed");
    expect(result.parseError).toContain("antiword missing");
  });
});
