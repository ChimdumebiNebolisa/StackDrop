import { useCallback, useEffect, useMemo, useState } from "react";

import { useAppData } from "../../../app/providers/AppDataProvider";
import type { ItemQueryFilters, ItemRecord } from "../../../domain/items/types";
import { listItems } from "../services/listItems";

function filtersKey(filters: ItemQueryFilters): string {
  return JSON.stringify({
    type: filters.type ?? null,
    tag: filters.tag ?? null,
    collectionId: filters.collectionId ?? null,
  });
}

export function useItemList(filters: ItemQueryFilters) {
  const { client, loadState, dataVersion } = useAppData();
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = useMemo(() => filtersKey(filters), [filters]);

  const load = useCallback(async () => {
    if (!client || loadState !== "ready") return;
    setLoading(true);
    setError(null);
    try {
      const parsed = JSON.parse(key) as {
        type: ItemRecord["type"] | null;
        tag: string | null;
        collectionId: string | null;
      };
      const f: ItemQueryFilters = {};
      if (parsed.type) f.type = parsed.type;
      if (parsed.tag) f.tag = parsed.tag;
      if (parsed.collectionId) f.collectionId = parsed.collectionId;
      const rows = await listItems(f, client);
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [client, loadState, key, dataVersion]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, error, reload: load };
}
