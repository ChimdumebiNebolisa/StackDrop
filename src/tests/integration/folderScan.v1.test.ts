import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestSqlClient } from "../../data/db/createTestSqlClient";
import { runMigrations } from "../../data/db/migrate";
import type { SqlClient } from "../../data/db/sqliteClient";
import { FolderRepository } from "../../data/repositories/folderRepository";
import { queryDocuments } from "../../features/documents/services/queryDocuments";
import { runAllFolderScans } from "../../features/folders/services/runAllFolderScans";
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
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  async function addFixtureFolder(rootPath = "C:\\fixture-root") {
    const folderId = crypto.randomUUID();
    await new FolderRepository(client).insertFolder({
      id: folderId,
      rootPath,
      createdAt: new Date().toISOString(),
    });
    return folderId;
  }

  function smokePdfBytes(token: string): Uint8Array {
    const escapePdfText = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
    const intro = escapePdfText("StackDrop smoke PDF selectable text");
    const escapedToken = escapePdfText(token);
    const stream = `BT /F1 12 Tf 72 720 Td (${intro}) Tj 0 -18 Td (${escapedToken}) Tj ET`;
    const objects = [
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
      "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
      `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    ];
    let body = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (const object of objects) {
      offsets.push(body.length);
      body += object;
    }
    const xrefOffset = body.length;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
      xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
    }
    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return new TextEncoder().encode(body + xref + trailer);
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

  it("indexes generated smoke selectable pdf text into FTS", async () => {
    const folderId = await addFixtureFolder();
    const token = "STACKDROP_SMOKE_PDF_TEXT_20260627";
    const pdfBytes = smokePdfBytes(token);
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValue([
      {
        absolutePath: "C:\\fixture-root\\selectable-text.pdf",
        relativePath: "selectable-text.pdf",
        fileName: "selectable-text.pdf",
        extension: "pdf",
        sizeBytes: pdfBytes.length,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(pdfBytes);

    await runFolderScan(folderId, client);

    const stored = await client.get<{ extracted_text: string | null }>(
      "SELECT extracted_text FROM indexed_documents WHERE file_name = ?",
      ["selectable-text.pdf"],
    );
    const fts = await client.get<{ body: string | null }>(
      `SELECT body FROM document_search s
       JOIN indexed_documents d ON s.document_id = d.id
       WHERE d.file_name = ?`,
      ["selectable-text.pdf"],
    );
    const hits = await queryDocuments(client, token, {});
    expect(stored?.extracted_text).toContain(token);
    expect(fts?.body).toContain(token);
    expect(hits).toHaveLength(1);
    expect(hits[0].fileName).toBe("selectable-text.pdf");
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

  it("replaces old searchable content when a file is edited and rescanned", async () => {
    const folderId = await addFixtureFolder();
    const discovered = [
      {
        absolutePath: "C:\\fixture-root\\a.txt",
        relativePath: "a.txt",
        fileName: "a.txt",
        extension: "txt",
        sizeBytes: 20,
        modifiedAtMs: Date.now(),
      },
    ];
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles)
      .mockResolvedValueOnce(discovered)
      .mockResolvedValueOnce([{ ...discovered[0], sizeBytes: 21, modifiedAtMs: Date.now() + 1 }]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot)
      .mockResolvedValueOnce(new TextEncoder().encode("OLD_EDIT_TOKEN"))
      .mockResolvedValueOnce(new TextEncoder().encode("NEW_EDIT_TOKEN"));

    await runFolderScan(folderId, client);
    await runFolderScan(folderId, client);

    expect(await queryDocuments(client, "OLD_EDIT_TOKEN", {})).toHaveLength(0);
    const hits = await queryDocuments(client, "NEW_EDIT_TOKEN", {});
    expect(hits).toHaveLength(1);
    expect(hits[0].fileName).toBe("a.txt");
  });

  it("removes stale filename/path rows when a file is renamed or moved within the root", async () => {
    const folderId = await addFixtureFolder();
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles)
      .mockResolvedValueOnce([
        {
          absolutePath: "C:\\fixture-root\\old-name.txt",
          relativePath: "old-name.txt",
          fileName: "old-name.txt",
          extension: "txt",
          sizeBytes: 16,
          modifiedAtMs: Date.now(),
        },
      ])
      .mockResolvedValueOnce([
        {
          absolutePath: "C:\\fixture-root\\nested\\new-name.txt",
          relativePath: "nested/new-name.txt",
          fileName: "new-name.txt",
          extension: "txt",
          sizeBytes: 16,
          modifiedAtMs: Date.now() + 1,
        },
      ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(
      new TextEncoder().encode("MOVE_TOKEN_2026"),
    );

    await runFolderScan(folderId, client);
    await runFolderScan(folderId, client);

    expect(await queryDocuments(client, "old-name", {})).toHaveLength(0);
    const hits = await queryDocuments(client, "MOVE_TOKEN_2026", {});
    expect(hits).toHaveLength(1);
    expect(hits[0].fileName).toBe("new-name.txt");
    expect(hits[0].relativePath).toBe("nested/new-name.txt");
  });

  it("removes stale FTS content when a previously indexed file can no longer be read", async () => {
    const folderId = await addFixtureFolder();
    const discovered = [
      {
        absolutePath: "C:\\fixture-root\\large.txt",
        relativePath: "large.txt",
        fileName: "large.txt",
        extension: "txt",
        sizeBytes: 20,
        modifiedAtMs: Date.now(),
      },
    ];
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles)
      .mockResolvedValueOnce(discovered)
      .mockResolvedValueOnce([{ ...discovered[0], sizeBytes: 52_428_801, modifiedAtMs: Date.now() + 1 }]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot)
      .mockResolvedValueOnce(new TextEncoder().encode("STALE_READ_TOKEN"))
      .mockRejectedValueOnce(new Error("File exceeds maximum read size of 52428800 bytes."));

    await runFolderScan(folderId, client);
    await runFolderScan(folderId, client);

    expect(await queryDocuments(client, "STALE_READ_TOKEN", {})).toHaveLength(0);
    const all = await queryDocuments(client, "", { folderId });
    expect(all).toHaveLength(1);
    expect(all[0].parseStatus).toBe("parse_failed");
    expect(all[0].failureStage).toBe("read");
    expect(all[0].parseError).toContain("maximum read size");
  });

  it("removes stale FTS content when a previously parsed file later fails parsing", async () => {
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
    vi.mocked(tauriFolderFs.invokeExtractDocTextUnderRoot)
      .mockResolvedValueOnce("STALE_PARSE_TOKEN")
      .mockRejectedValueOnce(new Error("Legacy .doc extraction failed"));

    await runFolderScan(folderId, client);
    await runFolderScan(folderId, client);

    expect(await queryDocuments(client, "STALE_PARSE_TOKEN", {})).toHaveLength(0);
    const all = await queryDocuments(client, "", { folderId });
    expect(all).toHaveLength(1);
    expect(all[0].parseStatus).toBe("parse_failed");
    expect(all[0].failureStage).toBe("parse");
  });

  it("indexes an empty txt file as parsed text without searchable body content", async () => {
    const folderId = await addFixtureFolder();
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValue([
      {
        absolutePath: "C:\\fixture-root\\empty.txt",
        relativePath: "empty.txt",
        fileName: "empty.txt",
        extension: "txt",
        sizeBytes: 0,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(new Uint8Array());

    const summary = await runFolderScan(folderId, client);

    expect(summary).toEqual({ discovered: 1, indexed: 1, failed: 0 });
    const all = await queryDocuments(client, "", { folderId });
    expect(all).toHaveLength(1);
    expect(all[0].parseStatus).toBe("parsed_text");
    expect(all[0].extractedText).toBe("");
    expect(await queryDocuments(client, "body-token-that-is-not-present", {})).toHaveLength(0);
  });

  it("keeps existing rows and reports the root path when a folder scan cannot start", async () => {
    const folderId = await addFixtureFolder();
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValueOnce([
      {
        absolutePath: "C:\\fixture-root\\keep.txt",
        relativePath: "keep.txt",
        fileName: "keep.txt",
        extension: "txt",
        sizeBytes: 16,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(
      new TextEncoder().encode("KEEP_TOKEN_2026"),
    );
    await runFolderScan(folderId, client);

    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockRejectedValueOnce(new Error("access denied"));
    const summary = await runAllFolderScans(client);

    expect(summary.errors).toEqual(["C:\\fixture-root: access denied"]);
    const folders = await new FolderRepository(client).listFolders();
    expect(folders[0].lastError).toBe("access denied");
    const hits = await queryDocuments(client, "KEEP_TOKEN_2026", {});
    expect(hits).toHaveLength(1);
    expect(hits[0].fileName).toBe("keep.txt");
  });

  it("times out a stuck file read, records failure, finishes the scan, and indexes later files", async () => {
    vi.useFakeTimers();
    const folderId = await addFixtureFolder();
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValue([
      {
        absolutePath: "C:\\fixture-root\\hang.txt",
        relativePath: "hang.txt",
        fileName: "hang.txt",
        extension: "txt",
        sizeBytes: 10,
        modifiedAtMs: Date.now(),
      },
      {
        absolutePath: "C:\\fixture-root\\later.txt",
        relativePath: "later.txt",
        fileName: "later.txt",
        extension: "txt",
        sizeBytes: 20,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockImplementation((_root, absolutePath) => {
      if (absolutePath.endsWith("hang.txt")) {
        return new Promise(() => undefined);
      }
      return Promise.resolve(new TextEncoder().encode("LATER_READ_TIMEOUT_TOKEN"));
    });

    const scan = runFolderScan(folderId, client, { fileReadTimeoutMs: 5 });
    await vi.advanceTimersByTimeAsync(5);
    const summary = await scan;

    expect(summary).toEqual({ discovered: 2, indexed: 1, failed: 1 });
    const docs = await queryDocuments(client, "", { folderId });
    expect(docs.find((doc) => doc.fileName === "hang.txt")).toMatchObject({
      parseStatus: "parse_failed",
      failureStage: "read",
    });
    expect(docs.find((doc) => doc.fileName === "hang.txt")?.parseError).toContain("File read timed out");
    expect(await queryDocuments(client, "LATER_READ_TIMEOUT_TOKEN", { folderId })).toHaveLength(1);
    const run = await client.get<{ finished_at: string | null; files_indexed: number; files_failed: number }>(
      "SELECT finished_at, files_indexed, files_failed FROM scan_runs WHERE folder_id = ? ORDER BY started_at DESC LIMIT 1",
      [folderId],
    );
    expect(run?.finished_at).toBeTruthy();
    expect(run).toMatchObject({ files_indexed: 1, files_failed: 1 });
  });

  it("times out a stuck parser, records failure, finishes the scan, and indexes later files", async () => {
    vi.useFakeTimers();
    const folderId = await addFixtureFolder();
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValue([
      {
        absolutePath: "C:\\fixture-root\\hang.doc",
        relativePath: "hang.doc",
        fileName: "hang.doc",
        extension: "doc",
        sizeBytes: 10,
        modifiedAtMs: Date.now(),
      },
      {
        absolutePath: "C:\\fixture-root\\later.txt",
        relativePath: "later.txt",
        fileName: "later.txt",
        extension: "txt",
        sizeBytes: 20,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(new TextEncoder().encode("LATER_PARSE_TIMEOUT_TOKEN"));
    vi.mocked(tauriFolderFs.invokeExtractDocTextUnderRoot).mockImplementation(() => new Promise(() => undefined));

    const scan = runFolderScan(folderId, client, { fileParseTimeoutMs: 5 });
    await vi.advanceTimersByTimeAsync(5);
    const summary = await scan;

    expect(summary).toEqual({ discovered: 2, indexed: 1, failed: 1 });
    const docs = await queryDocuments(client, "", { folderId });
    expect(docs.find((doc) => doc.fileName === "hang.doc")).toMatchObject({
      parseStatus: "parse_failed",
      failureStage: "parse",
    });
    expect(docs.find((doc) => doc.fileName === "hang.doc")?.parseError).toContain("File parse timed out");
    expect(await queryDocuments(client, "LATER_PARSE_TIMEOUT_TOKEN", { folderId })).toHaveLength(1);
    const run = await client.get<{ finished_at: string | null; files_indexed: number; files_failed: number }>(
      "SELECT finished_at, files_indexed, files_failed FROM scan_runs WHERE folder_id = ? ORDER BY started_at DESC LIMIT 1",
      [folderId],
    );
    expect(run?.finished_at).toBeTruthy();
    expect(run).toMatchObject({ files_indexed: 1, files_failed: 1 });
  });

  it("times out a blocked root scan and continues with later roots", async () => {
    vi.useFakeTimers();
    await addFixtureFolder("C:\\blocked-root");
    const goodFolderId = await addFixtureFolder("C:\\good-root");
    type DiscoveredFiles = Awaited<ReturnType<typeof tauriFolderFs.invokeDiscoverSupportedFiles>>;
    const blockedDiscovery: { release: ((files: DiscoveredFiles) => void) | null } = { release: null };

    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockImplementation((rootPath) => {
      if (rootPath === "C:\\blocked-root") {
        return new Promise((resolve) => {
          blockedDiscovery.release = resolve;
        });
      }
      return Promise.resolve([
        {
          absolutePath: "C:\\good-root\\good.txt",
          relativePath: "good.txt",
          fileName: "good.txt",
          extension: "txt",
          sizeBytes: 16,
          modifiedAtMs: Date.now(),
        },
      ]);
    });
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(
      new TextEncoder().encode("GOOD_ROOT_TOKEN_2026"),
    );

    const scan = runAllFolderScans(client, { rootTimeoutMs: 5 });
    await vi.advanceTimersByTimeAsync(5);
    const summary = await scan;

    expect(summary.rootsCompleted).toBe(2);
    expect(summary.errors).toEqual(["C:\\blocked-root: Root scan timed out after 1 seconds."]);
    const folders = await new FolderRepository(client).listFolders();
    expect(folders.find((folder) => folder.rootPath === "C:\\blocked-root")?.lastError).toBe(
      "Root scan timed out after 1 seconds.",
    );
    const hits = await queryDocuments(client, "GOOD_ROOT_TOKEN_2026", { folderId: goodFolderId });
    expect(hits).toHaveLength(1);
    expect(hits[0].fileName).toBe("good.txt");

    expect(blockedDiscovery.release).not.toBeNull();
    blockedDiscovery.release?.([
      {
        absolutePath: "C:\\blocked-root\\late.txt",
        relativePath: "late.txt",
        fileName: "late.txt",
        extension: "txt",
        sizeBytes: 16,
        modifiedAtMs: Date.now(),
      },
    ]);
    await Promise.resolve();
    expect(await queryDocuments(client, "late.txt", {})).toHaveLength(0);
  });

  it("searches by relative path and finds the document", async () => {
    const folderId = await addFixtureFolder();
    vi.mocked(tauriFolderFs.invokeDiscoverSupportedFiles).mockResolvedValue([
      {
        absolutePath: "C:\\fixture-root\\deep\\nested\\report.txt",
        relativePath: "deep/nested/report.txt",
        fileName: "report.txt",
        extension: "txt",
        sizeBytes: 10,
        modifiedAtMs: Date.now(),
      },
    ]);
    vi.mocked(tauriFolderFs.invokeReadFileBytesUnderRoot).mockResolvedValue(
      new TextEncoder().encode("some content"),
    );

    await runFolderScan(folderId, client);

    const hits = await queryDocuments(client, "nested", {});
    expect(hits).toHaveLength(1);
    expect(hits[0].fileName).toBe("report.txt");
    expect(hits[0].relativePath).toBe("deep/nested/report.txt");
  });
});
