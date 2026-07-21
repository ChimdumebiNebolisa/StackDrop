export type CredentialPersistence = "os_credential" | "session_only";

export interface OpenAICredentialStatus {
  configured: boolean;
  persistence: CredentialPersistence;
}

export type OpenAICredentialErrorCode = "credential_store_error" | "invalid_input" | "unknown";
