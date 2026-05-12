import { FormEvent, useEffect, useState } from "react";

import { useAppData } from "../../../app/providers/AppDataProvider";
import { assignCollection, removeCollectionAssignment } from "../../collections/services/manageCollection";
import { listCollections } from "../../collections/services/listCollections";

interface CollectionAssignerProps {
  itemId: string;
  currentCollectionId: string | null;
}

export function CollectionAssigner({ itemId, currentCollectionId }: CollectionAssignerProps) {
  const { client, bumpDataVersion } = useAppData();
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string>(currentCollectionId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    void listCollections(client).then(setCollections);
  }, [client]);

  useEffect(() => {
    setSelected(currentCollectionId ?? "");
  }, [currentCollectionId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      if (!selected) {
        await removeCollectionAssignment(itemId, client);
      } else {
        await assignCollection(itemId, selected, client);
      }
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
        Collection
        <select value={selected} onChange={(event) => setSelected(event.target.value)} disabled={busy}>
          <option value="">None</option>
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={busy} data-testid="save-collection">
        Save collection
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
