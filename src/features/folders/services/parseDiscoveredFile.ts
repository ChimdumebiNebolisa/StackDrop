import type { ParseStatus } from "../../../domain/documents/types";
import { parseFileContent } from "../../../domain/ingestion/parseFile";
import { invokeExtractDocTextUnderRoot, invokeOcrPdfTextUnderRoot } from "./tauriFolderFs";

export interface ParseDiscoveredFileInput {
  rootPath: string;
  absolutePath: string;
  extension: string;
  bytes: Uint8Array;
}

export interface ParseDiscoveredFileResult {
  parseStatus: ParseStatus;
  extractedText: string | null;
  parseError: string | null;
}

const PDF_OCR_MIN_TEXT_CHARS = 24;

function normalizeExt(extension: string): string {
  const e = extension.trim().toLowerCase();
  if (!e) return "";
  return e.startsWith(".") ? e : `.${e}`;
}

function looksNearEmptyText(text: string | undefined): boolean {
  if (!text) return true;
  return text.replace(/\s+/g, "").length < PDF_OCR_MIN_TEXT_CHARS;
}

export async function parseDiscoveredFile(input: ParseDiscoveredFileInput): Promise<ParseDiscoveredFileResult> {
  const ext = normalizeExt(input.extension);

  if (ext === ".doc") {
    try {
      const extracted = await invokeExtractDocTextUnderRoot(input.rootPath, input.absolutePath);
      const text = extracted.trim();
      if (!text) {
        return {
          parseStatus: "parse_failed",
          extractedText: null,
          parseError: "Legacy .doc parser returned empty text.",
        };
      }
      return { parseStatus: "parsed_text", extractedText: text, parseError: null };
    } catch (error) {
      return {
        parseStatus: "parse_failed",
        extractedText: null,
        parseError: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const parsed = await parseFileContent(ext, input.bytes);
  if (parsed.status === "parse_failed") {
    return {
      parseStatus: "parse_failed",
      extractedText: null,
      parseError: parsed.error ?? "Parse failed",
    };
  }

  if (ext !== ".pdf" || !looksNearEmptyText(parsed.extractedText)) {
    return {
      parseStatus: "parsed_text",
      extractedText: parsed.extractedText ?? "",
      parseError: null,
    };
  }

  try {
    const ocrText = (await invokeOcrPdfTextUnderRoot(input.rootPath, input.absolutePath)).trim();
    if (ocrText) {
      return {
        parseStatus: "parsed_ocr",
        extractedText: ocrText,
        parseError: null,
      };
    }

    if ((parsed.extractedText ?? "").trim().length > 0) {
      return {
        parseStatus: "parsed_text",
        extractedText: parsed.extractedText ?? "",
        parseError: null,
      };
    }

    return {
      parseStatus: "parse_failed",
      extractedText: null,
      parseError: "PDF text extraction and OCR both returned empty text.",
    };
  } catch (error) {
    if ((parsed.extractedText ?? "").trim().length > 0) {
      return {
        parseStatus: "parsed_text",
        extractedText: parsed.extractedText ?? "",
        parseError: null,
      };
    }
    return {
      parseStatus: "parse_failed",
      extractedText: null,
      parseError: error instanceof Error ? `OCR fallback failed: ${error.message}` : "OCR fallback failed",
    };
  }
}
