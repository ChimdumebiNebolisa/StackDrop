import type { PreparedDocumentText } from "../types/documentSummaryTypes";

export const MAX_DOCUMENT_CHARACTERS = 48_000;
export const OMISSION_MARKER = "\n\n[... content omitted by StackDrop ...]\n\n";

export class DocumentTextPreparationError extends Error {
  constructor() {
    super("Document text is empty after preparation.");
    this.name = "DocumentTextPreparationError";
  }
}

function normalizeDocumentText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function prepareDocumentText(input: string, maxCharacters = MAX_DOCUMENT_CHARACTERS): PreparedDocumentText {
  const normalized = normalizeDocumentText(input);
  if (!normalized) throw new DocumentTextPreparationError();

  const characters = Array.from(normalized);
  const originalCharacterCount = characters.length;
  if (originalCharacterCount <= maxCharacters) {
    return {
      text: normalized,
      truncated: false,
      originalCharacterCount,
      transmittedCharacterCount: originalCharacterCount,
    };
  }

  const markerCharacters = Array.from(OMISSION_MARKER).length * 2;
  if (maxCharacters <= markerCharacters + 3) {
    throw new RangeError("The document character limit is too small for bounded sampling.");
  }

  const contentBudget = maxCharacters - markerCharacters;
  const baseSectionLength = Math.floor(contentBudget / 3);
  const remainder = contentBudget % 3;
  const beginningLength = baseSectionLength + (remainder > 0 ? 1 : 0);
  const middleLength = baseSectionLength + (remainder > 1 ? 1 : 0);
  const endLength = baseSectionLength;
  const middleStart = Math.floor((characters.length - middleLength) / 2);

  const beginning = characters.slice(0, beginningLength).join("").trim();
  const middle = characters.slice(middleStart, middleStart + middleLength).join("").trim();
  const end = characters.slice(characters.length - endLength).join("").trim();
  const text = `${beginning}${OMISSION_MARKER}${middle}${OMISSION_MARKER}${end}`;

  return {
    text,
    truncated: true,
    originalCharacterCount,
    transmittedCharacterCount: Array.from(text).length,
  };
}
