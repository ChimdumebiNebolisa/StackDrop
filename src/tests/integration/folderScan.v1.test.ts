import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestSqlClient } from "../../data/db/createTestSqlClient";
import { runMigrations } from "../../data/db/migrate";
import type { SqlClient } from "../../data/db/sqliteClient";
import { FolderRepository } from "../../data/repositories/folderRepository";
import { queryDocuments } from "../../features/documents/services/queryDocuments";
import { runFolderScan } from "../../features/folders/services/runFolderScan";
import * as tauriFolderFs from "../../features/folders/services/tauriFolderFs";

vi.mock("../../features/folders/services/tauriFolderFs", () => ({
  invokeOpenFolderDialog: vi.fn(),
  invokeDiscoverSupportedFiles: vi.fn(),
  invokeReadFileBytesUnderRoot: vi.fn(),
  invokeOcrPdfTextUnderRoot: vi.fn(),
  invokeExtractDocTextUnderRoot: vi.fn(),
}));

describe("folder scan orchestration", () => {
  let client: SqlClient;

  beforeEach(async () => {
    client = await createTestSqlClient();
    await runMigrations(client);
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockReset();
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockReset();
    vi.mocked(tauriFolderFs.invokeOcrPdfTextUnderRoot).mockReset();
    vi.mocked(tauriFolderFs.invokeExtractDocTextUnderRoot).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function addFixtureFolder() {
    const folderId = crypto.randomUUID();
    await new FolderRepository(client).insertFolder({
      id: folderId,
      rootPath: "C:\\fixture-root",
      createdAt: new Date().toISOString(),
    });
    return folderId;
  }

  it("indexes discovered txt and finds it via content search", async () => {
    const folderId = await addFixtureFolder();
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValue([
      {
        absolutePath: "C:\\fixture-root\\nested\\a.txt",
        relativePath: "nested/a.txt",
        fileName: "a.txt",
        extension: "txt",
        sizeBytes: 12,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(
      new TextEncoder().encode("unique-stackdrop-scan-token"),
    );

    await runFolderScan(folderId, client);

    const hits = await queryDocuments(client, "unique-stackdrop-scan-token", {});
    expect(hits).toHaveLength(1);
    expect(hits[0].fileName).toBe("a.txt");
    expect(hits[0].parseStatus).toBe("parsed_text");
  });

  it("indexes docx and finds fixture token via content search", async () => {
    const folderId = await addFixtureFolder();
    const docxBytes = await readFile(join(process.cwd(), "src/tests/fixtures/minimal.docx"));
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValue([
      {
        absolutePath: "C:\\fixture-root\\w.docx",
        relativePath: "w.docx",
        fileName: "w.docx",
        extension: "docx",
        sizeBytes: docxBytes.length,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(new Uint8Array(docxBytes));

    await runFolderScan(folderId, client);

    const hits = await queryDocuments(client, "stackdrop-docx-fixture-token", {});
    expect(hits).toHaveLength(1);
    expect(hits[0].fileName).toBe("w.docx");
    expect(hits[0].parseStatus).toBe("parsed_text");
    expect(hits[0].extractedText).toContain("stackdrop-docx-fixture-token");
  });

  it("indexes text-layer pdf as parsed_text and stores searchable text", async () => {
    const folderId = await addFixtureFolder();
    const pdfBytes = await readFile(join(process.cwd(), "src/tests/fixtures/text-layer.pdf"));
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValue([
      {
        absolutePath: "C:\\fixture-root\\text-layer.pdf",
        relativePath: "text-layer.pdf",
        fileName: "text-layer.pdf",
        extension: "pdf",
        sizeBytes: pdfBytes.length,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(new Uint8Array(pdfBytes));

    await runFolderScan(folderId, client);

    const hits = await queryDocuments(client, "STACKDROP_PDF_TEXT_TOKEN_20260514", {});
    expect(hits).toHaveLength(1);
    expect(hits[0].parseStatus).toBe("parsed_text");
    expect(hits[0].extractedText).toContain("STACKDROP_PDF_TEXT_TOKEN_20260514");
    expect(vi.mocked(tauriFolderFs.invokeOcrPdfTextUnderRoot)).not.toHaveBeenCalled();
  });

  it("falls back to OCR for scanned pdf and stores searchable OCR text", async () => {
    const folderId = await addFixtureFolder();
    const scanPdfBytes = await readFile(join(process.cwd(), "src/tests/fixtures/scanned-image-only.pdf"));
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValue([
      {
        absolutePath: "C:\\fixture-root\\scanned-image-only.pdf",
        relativePath: "scanned-image-only.pdf",
        fileName: "scanned-image-only.pdf",
        extension: "pdf",
        sizeBytes: scanPdfBytes.length,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(new Uint8Array(scanPdfBytes));
    vi.mocked(tauriFolderFs.invokeOcrPdfTextUnderRoot).mockResolvedValue("STACKDROP OCR TOKEN 52614");

    await runFolderScan(folderId, client);

    const hits = await queryDocuments(client, "STACKDROP OCR TOKEN 52614", {});
    expect(hits).toHaveLength(1);
    expect(hits[0].parseStatus).toBe("parsed_ocr");
    expect(hits[0].extractedText).toContain("STACKDROP OCR TOKEN 52614");
  });

  it("marks parse_failed when OCR fallback fails for scanned pdf", async () => {
    const folderId = await addFixtureFolder();
    const scanPdfBytes = await readFile(join(process.cwd(), "src/tests/fixtures/scanned-image-only.pdf"));
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValue([
      {
        absolutePath: "C:\\fixture-root\\scan-fail.pdf",
        relativePath: "scan-fail.pdf",
        fileName: "scan-fail.pdf",
        extension: "pdf",
        sizeBytes: scanPdfBytes.length,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(new Uint8Array(scanPdfBytes));
    vi.mocked(tauriFolderFs.invokeOcrPdfTextUnderRoot).mockRejectedValue(new Error("tesseract unavailable"));

    await runFolderScan(folderId, client);

    const all = await queryDocuments(client, "", { folderId });
    expect(all).toHaveLength(1);
    expect(all[0].parseStatus).toBe("parse_failed");
    expect(all[0].parseError).toContain("OCR fallback failed");
    const search = await queryDocuments(client, "STACKDROP", { folderId });
    expect(search).toHaveLength(0);
  });

  it("extracts legacy doc text when antiword bridge succeeds", async () => {
    const folderId = await addFixtureFolder();
    const docBytes = await readFile(join(process.cwd(), "src/tests/fixtures/legacy-sample.doc"));
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValue([
      {
        absolutePath: "C:\\fixture-root\\legacy-sample.doc",
        relativePath: "legacy-sample.doc",
        fileName: "legacy-sample.doc",
        extension: "doc",
        sizeBytes: docBytes.length,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(new Uint8Array(docBytes));
    vi.mocked(tauriFolderFs.invokeExtractDocTextUnderRoot).mockResolvedValue(
      "Vestibulum neque massa, scelerisque sit amet ligula eu, congue molestie mi.",
    );

    await runFolderScan(folderId, client);

    const hits = await queryDocuments(client, "Vestibulum neque massa", {});
    expect(hits).toHaveLength(1);
    expect(hits[0].fileName).toBe("legacy-sample.doc");
    expect(hits[0].parseStatus).toBe("parsed_text");
  });

  it("marks parse_failed when legacy doc extraction fails", async () => {
    const folderId = await addFixtureFolder();
    const docBytes = await readFile(join(process.cwd(), "src/tests/fixtures/broken.doc"));
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValue([
      {
        absolutePath: "C:\\fixture-root\\broken.doc",
        relativePath: "broken.doc",
        fileName: "broken.doc",
        extension: "doc",
        sizeBytes: docBytes.length,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(new Uint8Array(docBytes));
    vi.mocked(tauriFolderFs.invokeExtractDocTextUnderRoot).mockRejectedValue(
      new Error("Legacy .doc extraction failed"),
    );

    await runFolderScan(folderId, client);

    const all = await queryDocuments(client, "", { folderId });
    expect(all).toHaveLength(1);
    expect(all[0].parseStatus).toBe("parse_failed");
    expect(all[0].parseError).toContain("Legacy .doc extraction failed");
  });

  it("removes documents missing after rescan", async () => {
    const folderId = await addFixtureFolder();
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValueOnce([
      {
        absolutePath: "C:\\fixture-root\\a.txt",
        relativePath: "a.txt",
        fileName: "a.txt",
        extension: "txt",
        sizeBytes: 1,
        modifiedAtMs: Date.now(),
      },
      {
        absolutePath: "C:\\fixture-root\\b.txt",
        relativePath: "b.txt",
        fileName: "b.txt",
        extension: "txt",
        sizeBytes: 1,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(new TextEncoder().encode("x"));
    await runFolderScan(folderId, client);

    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValueOnce([
      {
        absolutePath: "C:\\fixture-root\\a.txt",
        relativePath: "a.txt",
        fileName: "a.txt",
        extension: "txt",
        sizeBytes: 1,
        modifiedAtMs: Date.now(),
      },
    ]);
    await runFolderScan(folderId, client);

    const all = await queryDocuments(client, "", { folderId });
    expect(all).toHaveLength(1);
    expect(all[0].fileName).toBe("a.txt");
  });
});
