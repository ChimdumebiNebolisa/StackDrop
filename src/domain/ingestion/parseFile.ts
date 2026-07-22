import { getFileCapability } from "../documents/generatedFileCapabilities";
import { parseDocxFromBytes } from "./parsers/docxParser";
import { parsePdfFromBytes } from "./parsers/pdfParser";
import { parseTxtFromUtf8 } from "./parsers/txtParser";

export interface ParseFileResult {
  status: "parsed_text" | "parse_failed";
  extractedText?: string;
  error?: string;
}

/**
 * Parse supported file types from raw bytes. No Node or OS APIs - safe for the browser bundle.
 */
export async function parseFileContent(extension: string, bytes: Uint8Array): Promise<ParseFileResult> {
  const capability = getFileCapability(extension);
  if (!capability) {
    return { status: "parse_failed", error: "Missing or unsupported file extension." };
  }
  if (capability.parseRuntime === "native") {
    return { status: "parse_failed", error: `Unsupported browser parser for .${capability.extension}` };
  }

  try {
    let extractedText = "";
    switch (capability.parserId) {
      case "txt-utf8":
        extractedText = parseTxtFromUtf8(bytes);
        break;
      case "pdf-text":
        extractedText = await parsePdfFromBytes(bytes);
        break;
      case "docx-mammoth":
        extractedText = await parseDocxFromBytes(bytes);
        break;
      default:
        return { status: "parse_failed", error: `Unsupported parser route: ${capability.parserId}` };
    }
    return { status: "parsed_text", extractedText };
  } catch (error) {
    return {
      status: "parse_failed",
      error: error instanceof Error ? error.message : "Unknown parse failure",
    };
  }
}
