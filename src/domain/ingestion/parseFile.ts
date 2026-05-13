import { parseDocxFromBytes } from "./parsers/docxParser";
import { parsePdfFromBytes } from "./parsers/pdfParser";
import { parseTxtFromUtf8 } from "./parsers/txtParser";

export interface ParseFileResult {
  status: "parsed_text" | "parse_failed";
  extractedText?: string;
  error?: string;
}

function normalizeExtension(extension: string): string {
  const e = extension.trim().toLowerCase();
  if (!e) return "";
  return e.startsWith(".") ? e : `.${e}`;
}

/**
 * Parse supported file types from raw bytes. No Node or OS APIs — safe for the browser bundle.
 */
export async function parseFileContent(extension: string, bytes: Uint8Array): Promise<ParseFileResult> {
  const ext = normalizeExtension(extension);
  if (!ext) {
    return { status: "parse_failed", error: "Missing file extension." };
  }
  try {
    let extractedText = "";
    if (ext === ".txt") {
      extractedText = parseTxtFromUtf8(bytes);
    } else if (ext === ".pdf") {
      extractedText = await parsePdfFromBytes(bytes);
    } else if (ext === ".docx") {
      extractedText = await parseDocxFromBytes(bytes);
    } else {
      return { status: "parse_failed", error: `Unsupported file extension: ${ext}` };
    }
    return { status: "parsed_text", extractedText };
  } catch (error) {
    return {
      status: "parse_failed",
      error: error instanceof Error ? error.message : "Unknown parse failure",
    };
  }
}
