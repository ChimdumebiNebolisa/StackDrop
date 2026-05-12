import { useState } from "react";

import { useAppData } from "../../../app/providers/AppDataProvider";
import { saveLink as saveLinkService, type SaveLinkInput } from "../services/saveLink";

export function useSaveLink() {
  const { client, loadState, bumpDataVersion } = useAppData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveLink = async (input: SaveLinkInput) => {
    if (!client || loadState !== "ready") {
      setError("Database is not ready.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveLinkService(input, client);
      bumpDataVersion();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return { saveLink, busy, error, clearError: () => setError(null) };
}
