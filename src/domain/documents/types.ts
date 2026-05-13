export type FileExtension = "txt" | "pdf" | "docx" | "doc";

export type ParseStatus = "parsed_text" | "parsed_ocr" | "parse_failed";

export interface IndexedFolderRecord {
  id: string;
  rootPath: string;
  createdAt: string;
  lastScanAt: string | null;
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
