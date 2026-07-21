import type { FileExtension, ParseStatus } from "../../../domain/documents/types";

export interface SummarySourceDocument {
  id: string;
  fileName: string;
  relativePath: string;
  fileExtension: FileExtension;
  parseStatus: ParseStatus;
  extractedText: string | null;
}

export interface PreparedDocumentText {
  text: string;
  truncated: boolean;
  originalCharacterCount: number;
  transmittedCharacterCount: number;
}

export interface SummaryRequest {
  documentId: string;
  fileName: string;
  relativePath: string;
  fileExtension: string;
  preparedText: string;
}

export interface DocumentSummary {
  overview: string;
  keyPoints: string[];
  importantDetails: string[];
  importantDates: string[];
  actionItems: string[];
  uncertainties: string[];
}

export type SummaryErrorCode =
  | "api_key_missing"
  | "invalid_api_key"
  | "permission_denied"
  | "rate_limited"
  | "timeout"
  | "network_error"
  | "model_unavailable"
  | "malformed_response"
  | "credential_store_error"
  | "request_in_progress"
  | "request_refused"
  | "invalid_input"
  | "unknown";
