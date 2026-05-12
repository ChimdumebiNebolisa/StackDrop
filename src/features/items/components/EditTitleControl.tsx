import { FormEvent, useState } from "react";

import { useAppData } from "../../../app/providers/AppDataProvider";
import { updateItemMetadata } from "../../../domain/items/updateItemMetadata";

interface EditTitleControlProps {
  itemId: string;
  initialTitle: string;
}

export function EditTitleControl({ itemId, initialTitle }: EditTitleControlProps) {
  const { client, bumpDataVersion } = useAppData();
  const [title, setTitle] = useState(initialTitle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      await updateItemMetadata({ id: itemId, title }, client);
      bumpDataVersion();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="inline-form" onSubmit={onSubmit}>
      <label>
        Title
        <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} />
      </label>
      <button type="submit" disabled={busy} data-testid="save-title">
        Save title
      </button>
      {error ? (
        <span className="form-error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
