export type FileExtension = "txt" | "md" | "pdf";

export type ParseStatus = "indexed" | "failed";

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
