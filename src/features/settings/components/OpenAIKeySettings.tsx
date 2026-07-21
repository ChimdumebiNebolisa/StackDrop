import { type FormEvent, useEffect, useState } from "react";

import {
  getOpenAICredentialErrorCode,
  hasOpenAIApiKey,
  removeOpenAIApiKey,
  saveOpenAIApiKey,
} from "../services/openAICredentialService";
import type { OpenAICredentialStatus } from "../types/openAICredentialTypes";

function credentialErrorMessage(error: unknown): string {
  const code = getOpenAICredentialErrorCode(error);
  if (code === "invalid_input") return "Enter an API key before saving.";
  if (code === "credential_store_error") return "StackDrop could not access secure credential storage. Try again.";
  return "StackDrop could not update the API key. Try again.";
}

export function OpenAIKeySettings() {
  const [status, setStatus] = useState<OpenAICredentialStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [replacing, setReplacing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void hasOpenAIApiKey()
      .then((nextStatus) => {
        if (active) setStatus(nextStatus);
      })
      .catch((reason: unknown) => {
        if (active) setError(credentialErrorMessage(reason));
      });
    return () => {
      active = false;
    };
  }, []);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!apiKey.trim()) {
      setError("Enter an API key before saving.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const nextStatus = await saveOpenAIApiKey(apiKey);
      setStatus(nextStatus);
      setReplacing(false);
    } catch (reason) {
      setError(credentialErrorMessage(reason));
    } finally {
      setApiKey("");
      setBusy(false);
    }
  }

  async function onRemove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const nextStatus = await removeOpenAIApiKey();
      setStatus(nextStatus);
      setReplacing(false);
      setApiKey("");
    } catch (reason) {
      setError(credentialErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  const configured = status?.configured === true;
  const showInput = !configured || replacing;

  return (
    <section className="openai-key-settings" aria-labelledby="document-summaries-settings-heading">
      <div>
        <h3 id="document-summaries-settings-heading">Document summaries</h3>
        <p>Summaries require your own OpenAI API key.</p>
        <p className="muted">
          StackDrop keeps document indexing and search local. When you choose Summarize, prepared text from that document is sent to OpenAI
          using your API key.
        </p>
      </div>

      {configured ? (
        <p className="credential-status" role="status">
          API key configured
          {status.persistence === "session_only" ? " for this session" : ""}
        </p>
      ) : null}

      {showInput ? (
        <form className="openai-key-form" onSubmit={(event) => void onSave(event)}>
          <label htmlFor="openai-api-key">OpenAI API key</label>
          <input
            id="openai-api-key"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            autoComplete="new-password"
            spellCheck={false}
            disabled={busy}
          />
          <div className="settings-actions">
            <button type="submit" className="button-primary" disabled={busy}>
              Save key
            </button>
            {replacing ? (
              <button
                type="button"
                className="button-secondary"
                disabled={busy}
                onClick={() => {
                  setReplacing(false);
                  setApiKey("");
                  setError(null);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="settings-actions">
          <button type="button" className="button-secondary" disabled={busy} onClick={() => setReplacing(true)}>
            Replace key
          </button>
          <button type="button" className="button-danger" disabled={busy} onClick={() => void onRemove()}>
            Remove key
          </button>
        </div>
      )}

      {status?.persistence === "session_only" ? (
        <p className="muted small">Secure persistent storage is unavailable on this development platform, so the key lasts only for this session.</p>
      ) : null}
      <p className={error ? "settings-message error" : "settings-message"} aria-live="polite">
        {error ?? (busy ? "Updating API key..." : "")}
      </p>
    </section>
  );
}
