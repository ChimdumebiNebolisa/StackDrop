import { invoke } from "@tauri-apps/api/core";

import type { DocumentSummary, SummaryErrorCode, SummaryRequest } from "../types/documentSummaryTypes";
import { validateDocumentSummary } from "../validation/validateDocumentSummary";

const SUMMARY_ERROR_CODES = new Set<SummaryErrorCode>([
  "api_key_missing",
  "invalid_api_key",
  "permission_denied",
  "rate_limited",
  "timeout",
  "network_error",
  "model_unavailable",
  "malformed_response",
  "credential_store_error",
  "request_in_progress",
  "request_refused",
  "invalid_input",
  "unknown",
]);

function useE2EShim(): boolean {
  return import.meta.env.VITE_E2E_SQLITE === "1" && typeof window !== "undefined";
}

export async function summarizeDocument(request: SummaryRequest): Promise<DocumentSummary> {
  let result: unknown;
  if (useE2EShim()) {
    const hook = window.__STACKDROP_E2E__?.summarizeDocument;
    if (!hook) throw { code: "unknown" };
    result = await hook(request);
  } else {
    result = await invoke<unknown>("summarize_document", { request });
  }

  try {
    return validateDocumentSummary(result);
  } catch {
    throw { code: "malformed_response" };
  }
}

export function getSummaryErrorCode(error: unknown): SummaryErrorCode {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && SUMMARY_ERROR_CODES.has(code as SummaryErrorCode)) return code as SummaryErrorCode;
  }
  return "unknown";
}
