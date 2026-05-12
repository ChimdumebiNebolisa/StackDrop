import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAppData } from "../../../app/providers/AppDataProvider";
import { removeItem } from "../../../domain/items/removeItem";

interface RemoveItemControlProps {
  itemId: string;
}

export function RemoveItemControl({ itemId }: RemoveItemControlProps) {
  const { client, bumpDataVersion } = useAppData();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRemove = async () => {
    if (!client) return;
    if (!window.confirm("Remove this item from StackDrop? The original file on disk will not be deleted.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await removeItem(itemId, client);
      bumpDataVersion();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="danger-zone">
      <button type="button" className="danger-button" onClick={() => void onRemove()} disabled={busy} data-testid="remove-item">
        {busy ? "Removing…" : "Remove from index"}
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
