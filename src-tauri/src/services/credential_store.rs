use serde::Serialize;
use std::sync::Mutex;
use zeroize::Zeroizing;

pub const OPENAI_CREDENTIAL_SERVICE: &str = "com.stackdrop.app";
pub const OPENAI_CREDENTIAL_ACCOUNT: &str = "openai-api-key";

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CredentialPersistence {
    #[cfg(windows)]
    OsCredential,
    #[cfg(not(windows))]
    SessionOnly,
}

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialStatus {
    pub configured: bool,
    pub persistence: CredentialPersistence,
}

#[derive(Clone, Copy, Debug)]
pub struct CredentialStoreError;

#[cfg(windows)]
pub struct CredentialStore {
    operation_lock: Mutex<()>,
}

#[cfg(not(windows))]
pub struct CredentialStore {
    session_key: Mutex<Option<Zeroizing<String>>>,
}

impl CredentialStore {
    pub fn new() -> Self {
        #[cfg(windows)]
        {
            Self {
                operation_lock: Mutex::new(()),
            }
        }

        #[cfg(not(windows))]
        {
            Self {
                session_key: Mutex::new(None),
            }
        }
    }

    pub fn status(&self) -> Result<CredentialStatus, CredentialStoreError> {
        Ok(CredentialStatus {
            configured: self.get()?.is_some(),
            persistence: self.persistence(),
        })
    }

    #[cfg(windows)]
    pub fn set(&self, api_key: &str) -> Result<(), CredentialStoreError> {
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| CredentialStoreError)?;
        let entry = keyring::Entry::new(OPENAI_CREDENTIAL_SERVICE, OPENAI_CREDENTIAL_ACCOUNT)
            .map_err(|_| CredentialStoreError)?;
        entry
            .set_password(api_key)
            .map_err(|_| CredentialStoreError)
    }

    #[cfg(not(windows))]
    pub fn set(&self, api_key: &str) -> Result<(), CredentialStoreError> {
        let mut stored = self.session_key.lock().map_err(|_| CredentialStoreError)?;
        *stored = Some(Zeroizing::new(api_key.to_owned()));
        Ok(())
    }

    #[cfg(windows)]
    pub fn get(&self) -> Result<Option<Zeroizing<String>>, CredentialStoreError> {
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| CredentialStoreError)?;
        let entry = keyring::Entry::new(OPENAI_CREDENTIAL_SERVICE, OPENAI_CREDENTIAL_ACCOUNT)
            .map_err(|_| CredentialStoreError)?;
        match entry.get_password() {
            Ok(password) => Ok(Some(Zeroizing::new(password))),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(_) => Err(CredentialStoreError),
        }
    }

    #[cfg(not(windows))]
    pub fn get(&self) -> Result<Option<Zeroizing<String>>, CredentialStoreError> {
        let stored = self.session_key.lock().map_err(|_| CredentialStoreError)?;
        Ok(stored
            .as_ref()
            .map(|password| Zeroizing::new(password.as_str().to_owned())))
    }

    #[cfg(windows)]
    pub fn remove(&self) -> Result<(), CredentialStoreError> {
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| CredentialStoreError)?;
        let entry = keyring::Entry::new(OPENAI_CREDENTIAL_SERVICE, OPENAI_CREDENTIAL_ACCOUNT)
            .map_err(|_| CredentialStoreError)?;
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err(CredentialStoreError),
        }
    }

    #[cfg(not(windows))]
    pub fn remove(&self) -> Result<(), CredentialStoreError> {
        let mut stored = self.session_key.lock().map_err(|_| CredentialStoreError)?;
        *stored = None;
        Ok(())
    }

    fn persistence(&self) -> CredentialPersistence {
        #[cfg(windows)]
        {
            CredentialPersistence::OsCredential
        }

        #[cfg(not(windows))]
        {
            CredentialPersistence::SessionOnly
        }
    }
}

impl Default for CredentialStore {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn credential_identifiers_are_stable() {
        assert_eq!(OPENAI_CREDENTIAL_SERVICE, "com.stackdrop.app");
        assert_eq!(OPENAI_CREDENTIAL_ACCOUNT, "openai-api-key");
    }

    #[test]
    fn errors_do_not_contain_secret_values() {
        let secret = "not-a-real-secret-value";
        let rendered = format!("{:?}", CredentialStoreError);
        assert!(!rendered.contains(secret));
    }
}
