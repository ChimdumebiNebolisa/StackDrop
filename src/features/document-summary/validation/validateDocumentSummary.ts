import type { DocumentSummary } from "../types/documentSummaryTypes";

const EXPECTED_KEYS = ["overview", "keyPoints", "importantDetails", "importantDates", "actionItems", "uncertainties"] as const;
const MAX_OVERVIEW_CHARACTERS = 2_000;
const MAX_ARRAY_ITEMS = 8;
const MAX_ITEM_CHARACTERS = 500;

export class DocumentSummaryValidationError extends Error {
  constructor() {
    super("The document summary did not match the expected structure.");
    this.name = "DocumentSummaryValidationError";
  }
}

function parseSource(source: unknown): unknown {
  if (typeof source !== "string") return source;
  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new DocumentSummaryValidationError();
  }
}

function validateText(value: unknown, maxCharacters: number): string {
  if (typeof value !== "string") throw new DocumentSummaryValidationError();
  const normalized = value.trim();
  if (!normalized || Array.from(normalized).length > maxCharacters) throw new DocumentSummaryValidationError();
  return normalized;
}

function validateList(value: unknown, required: boolean): string[] {
  if (!Array.isArray(value) || value.length > MAX_ARRAY_ITEMS || (required && value.length === 0)) {
    throw new DocumentSummaryValidationError();
  }
  return value.map((item) => validateText(item, MAX_ITEM_CHARACTERS));
}

export function validateDocumentSummary(source: unknown): DocumentSummary {
  const parsed = parseSource(source);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new DocumentSummaryValidationError();

  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== EXPECTED_KEYS.length || keys.some((key) => !EXPECTED_KEYS.includes(key as (typeof EXPECTED_KEYS)[number]))) {
    throw new DocumentSummaryValidationError();
  }

  return {
    overview: validateText(record.overview, MAX_OVERVIEW_CHARACTERS),
    keyPoints: validateList(record.keyPoints, true),
    importantDetails: validateList(record.importantDetails, true),
    importantDates: validateList(record.importantDates, false),
    actionItems: validateList(record.actionItems, false),
    uncertainties: validateList(record.uncertainties, false),
  };
}
