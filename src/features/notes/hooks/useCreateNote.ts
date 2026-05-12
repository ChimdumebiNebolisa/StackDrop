import { useState } from "react";

import { useAppData } from "../../../app/providers/AppDataProvider";
import { createNote as createNoteService, type CreateNoteInput } from "../services/createNote";

export function useCreateNote() {
  const { client, loadState, bumpDataVersion } = useAppData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createNote = async (input: CreateNoteInput) => {
    if (!client || loadState !== "ready") {
      setError("Database is not ready.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createNoteService(input, client);
      bumpDataVersion();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return { createNote, busy, error, clearError: () => setError(null) };
}
