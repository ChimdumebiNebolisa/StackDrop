use crate::services::credential_store::{CredentialStatus, CredentialStore, CredentialStoreError};
use crate::services::openai_summary::{
    DocumentSummary, OpenAiSummaryService, SummaryRequest, SummaryServiceError,
};
use serde::Serialize;
use std::collections::HashSet;
use std::sync::Mutex;
use tauri::State;
use zeroize::Zeroizing;

const MAX_API_KEY_CHARACTERS: usize = 512;

pub struct SummaryCommandState {
    credentials: CredentialStore,
    openai: OpenAiSummaryService,
    in_flight: Mutex<HashSet<String>>,
}

impl SummaryCommandState {
    pub fn new() -> Result<Self, SummaryServiceError> {
        Ok(Self {
            credentials: CredentialStore::new(),
            openai: OpenAiSummaryService::new()?,
            in_flight: Mutex::new(HashSet::new()),
        })
    }
}

#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CommandErrorCode {
    ApiKeyMissing,
    InvalidApiKey,
    PermissionDenied,
    RateLimited,
    Timeout,
    NetworkError,
    ModelUnavailable,
    MalformedResponse,
    CredentialStoreError,
    RequestInProgress,
    RequestRefused,
    InvalidInput,
    Unknown,
}

#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
pub struct CommandError {
    pub code: CommandErrorCode,
}

impl From<CredentialStoreError> for CommandError {
    fn from(_: CredentialStoreError) -> Self {
        Self {
            code: CommandErrorCode::CredentialStoreError,
        }
    }
}

impl From<SummaryServiceError> for CommandError {
    fn from(error: SummaryServiceError) -> Self {
        let code = match error {
            SummaryServiceError::InvalidApiKey => CommandErrorCode::InvalidApiKey,
            SummaryServiceError::PermissionDenied => CommandErrorCode::PermissionDenied,
            SummaryServiceError::RateLimited => CommandErrorCode::RateLimited,
            SummaryServiceError::Timeout => CommandErrorCode::Timeout,
            SummaryServiceError::Network => CommandErrorCode::NetworkError,
            SummaryServiceError::ModelUnavailable => CommandErrorCode::ModelUnavailable,
            SummaryServiceError::MalformedResponse => CommandErrorCode::MalformedResponse,
            SummaryServiceError::RequestRefused => CommandErrorCode::RequestRefused,
            SummaryServiceError::InvalidInput => CommandErrorCode::InvalidInput,
            SummaryServiceError::Unknown => CommandErrorCode::Unknown,
        };
        Self { code }
    }
}

#[tauri::command]
pub fn save_openai_api_key(
    state: State<'_, SummaryCommandState>,
    api_key: String,
) -> Result<CredentialStatus, CommandError> {
    let api_key = Zeroizing::new(api_key);
    let trimmed = api_key.trim();
    if trimmed.is_empty() || trimmed.chars().count() > MAX_API_KEY_CHARACTERS {
        return Err(CommandError {
            code: CommandErrorCode::InvalidInput,
        });
    }
    state.credentials.set(trimmed)?;
    state.credentials.status().map_err(Into::into)
}

#[tauri::command]
pub fn has_openai_api_key(
    state: State<'_, SummaryCommandState>,
) -> Result<CredentialStatus, CommandError> {
    state.credentials.status().map_err(Into::into)
}

#[tauri::command]
pub fn remove_openai_api_key(
    state: State<'_, SummaryCommandState>,
) -> Result<CredentialStatus, CommandError> {
    state.credentials.remove()?;
    state.credentials.status().map_err(Into::into)
}

#[tauri::command]
pub async fn summarize_document(
    state: State<'_, SummaryCommandState>,
    request: SummaryRequest,
) -> Result<DocumentSummary, CommandError> {
    let document_id = request.document_id.clone();
    {
        let mut in_flight = state.in_flight.lock().map_err(|_| CommandError {
            code: CommandErrorCode::Unknown,
        })?;
        if !in_flight.insert(document_id.clone()) {
            return Err(CommandError {
                code: CommandErrorCode::RequestInProgress,
            });
        }
    }

    let result = async {
        let api_key = state.credentials.get()?.ok_or(CommandError {
            code: CommandErrorCode::ApiKeyMissing,
        })?;
        state
            .openai
            .summarize(&api_key, &request)
            .await
            .map_err(CommandError::from)
    }
    .await;

    if let Ok(mut in_flight) = state.in_flight.lock() {
        in_flight.remove(&document_id);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn command_errors_serialize_without_secret_material() {
        let secret = "not-a-real-secret-value";
        let error = CommandError {
            code: CommandErrorCode::InvalidApiKey,
        };
        let serialized = serde_json::to_string(&error).unwrap();
        assert_eq!(serialized, r#"{"code":"invalid_api_key"}"#);
        assert!(!serialized.contains(secret));
    }
}
