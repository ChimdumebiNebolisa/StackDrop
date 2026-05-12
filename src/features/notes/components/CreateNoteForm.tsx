import { FormEvent, useState } from "react";

import { useCreateNote } from "../hooks/useCreateNote";

export function CreateNoteForm() {
  const { createNote, busy, error, clearError } = useCreateNote();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearError();
    try {
      await createNote({ title, body });
      setTitle("");
      setBody("");
    } catch {
      /* error surfaced via hook */
    }
  };

  return (
    <form className="card form-card" onSubmit={onSubmit} aria-labelledby="create-note-heading">
      <h2 id="create-note-heading" className="card-title">
        New note
      </h2>
      <label className="field">
        <span>Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          disabled={busy}
        />
      </label>
      <label className="field">
        <span>Body</span>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={4} required disabled={busy} />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} data-testid="create-note-submit">
        {busy ? "Saving…" : "Save note"}
      </button>
    </form>
  );
}
