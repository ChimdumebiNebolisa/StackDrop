import { FormEvent, useState } from "react";

import { useAppData } from "../../../app/providers/AppDataProvider";
import { manageTags } from "../../tags/services/manageTags";

interface TagEditorProps {
  itemId: string;
  initialTags: string[];
}

export function TagEditor({ itemId, initialTags }: TagEditorProps) {
  const { client, bumpDataVersion } = useAppData();
  const [tagsText, setTagsText] = useState(initialTags.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      const tags = tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      await manageTags(itemId, tags, client);
      bumpDataVersion();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stacked-form" onSubmit={onSubmit}>
      <label>
        Tags (comma-separated)
        <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} disabled={busy} />
      </label>
      <button type="submit" disabled={busy} data-testid="save-tags">
        Save tags
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
