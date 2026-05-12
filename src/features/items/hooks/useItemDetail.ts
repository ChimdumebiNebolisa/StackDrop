import { useCallback, useEffect, useState } from "react";

import { useAppData } from "../../../app/providers/AppDataProvider";
import { getItemDetail } from "../services/getItemDetail";

export function useItemDetail(id: string | undefined) {
  const { client, loadState, dataVersion } = useAppData();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getItemDetail>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !client || loadState !== "ready") return;
    setLoading(true);
    setError(null);
    try {
      const result = await getItemDetail(id, client);
      setDetail(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [id, client, loadState, dataVersion]);

  useEffect(() => {
    void load();
  }, [load]);

  return { detail, loading, error, reload: load };
}
