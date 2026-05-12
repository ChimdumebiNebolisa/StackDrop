import { useState } from "react";

import { useAppData } from "../../../app/providers/AppDataProvider";
import { triggerFileImport } from "../services/triggerFileImport";

export function useImportFile() {
  const { client, loadState, bumpDataVersion } = useAppData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importFromPicker = async () => {
    if (!client || loadState !== "ready") {
      setError("Database is not ready.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await triggerFileImport(client);
      if (result) {
        bumpDataVersion();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return { importFromPicker, busy, error, clearError: () => setError(null) };
}
