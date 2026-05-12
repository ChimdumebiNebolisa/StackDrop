import { FormEvent, useState } from "react";

import { useSaveLink } from "../hooks/useSaveLink";

export function SaveLinkForm() {
  const { saveLink, busy, error, clearError } = useSaveLink();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearError();
    try {
      await saveLink({ title, url });
      setTitle("");
      setUrl("");
    } catch {
      /* surfaced */
    }
  };

  return (
    <form className="card form-card" onSubmit={onSubmit} aria-labelledby="save-link-heading">
      <h2 id="save-link-heading" className="card-title">
        New link
      </h2>
      <label className="field">
        <span>Title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} required disabled={busy} />
      </label>
      <label className="field">
        <span>URL</span>
        <input value={url} onChange={(event) => setUrl(event.target.value)} required disabled={busy} />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} data-testid="save-link-submit">
        {busy ? "Saving…" : "Save link"}
      </button>
    </form>
  );
}
