import { invoke } from "@tauri-apps/api/core";

import type { OpenAICredentialErrorCode, OpenAICredentialStatus } from "../types/openAICredentialTypes";

const CREDENTIAL_ERROR_CODES = new Set<OpenAICredentialErrorCode>(["credential_store_error", "invalid_input", "unknown"]);

function useE2EShim(): boolean {
  return import.meta.env.VITE_E2E_SQLITE === "1" && typeof window !== "undefined";
}

export async function hasOpenAIApiKey(): Promise<OpenAICredentialStatus> {
  if (useE2EShim()) {
    const hook = window.__STACKDROP_E2E__?.hasOpenAIApiKey;
    if (!hook) throw { code: "unknown" };
    return await hook();
  }
  return invoke<OpenAICredentialStatus>("has_openai_api_key");
}

export async function saveOpenAIApiKey(apiKey: string): Promise<OpenAICredentialStatus> {
  if (useE2EShim()) {
    const hook = window.__STACKDROP_E2E__?.saveOpenAIApiKey;
    if (!hook) throw { code: "unknown" };
    return await hook(apiKey);
  }
  return invoke<OpenAICredentialStatus>("save_openai_api_key", { apiKey });
}

export async function removeOpenAIApiKey(): Promise<OpenAICredentialStatus> {
  if (useE2EShim()) {
    const hook = window.__STACKDROP_E2E__?.removeOpenAIApiKey;
    if (!hook) throw { code: "unknown" };
    return await hook();
  }
  return invoke<OpenAICredentialStatus>("remove_openai_api_key");
}

export function getOpenAICredentialErrorCode(error: unknown): OpenAICredentialErrorCode {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && CREDENTIAL_ERROR_CODES.has(code as OpenAICredentialErrorCode)) {
      return code as OpenAICredentialErrorCode;
    }
  }
  return "unknown";
}
