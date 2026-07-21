import type { FileExtension } from "./generatedFileCapabilities";

export type { FileExtension } from "./generatedFileCapabilities";

export type ParseStatus = "parsed_text" | "parsed_ocr" | "parse_failed";

export type FailureStage = "read" | "parse";

export interface IndexedFolderRecord {
  id: string;
  rootPath: string;
  createdAt: string;
  lastScanAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
}

export interface IndexedDocumentRecord {
  id: string;
  folderId: string;
  absolutePath: string;
  relativePath: string;
  fileName: string;
  fileExtension: FileExtension;
  sizeBytes: number;
  modifiedAt: string;
  parseStatus: ParseStatus;
  failureStage: FailureStage | null;
  parseError: string | null;
  extractedText: string | null;
  updatedAt: string;
}

export interface DocumentQueryFilters {
  folderId?: string;
  extension?: FileExtension;
  parseStatus?: ParseStatus;
  sort?: "relevance" | "recent";
}

export interface SearchResultRecord extends IndexedDocumentRecord {
  searchSnippet?: string | null;
}
