import { useCallback, useEffect, useState } from "react";

import { useAppData } from "../../../app/providers/AppDataProvider";
import type { ItemQueryFilters, ItemRecord } from "../../../domain/items/types";
import { searchItems } from "../../../domain/search/searchItems";
import { listItems } from "../../items/services/listItems";

export function useSearch(options: {
  query: string;
  typeFilter?: ItemRecord["type"];
  tagFilter?: string;
  sort: "recent" | "relevance";
}) {
  const { client, loadState, dataVersion } = useAppData();
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client || loadState !== "ready") return;
    setLoading(true);
    setError(null);
    try {
      const q = options.query.trim();
      const filters: ItemQueryFilters = {
        type: options.typeFilter,
        tag: options.tagFilter,
        sort: options.sort,
      };
      if (!q) {
        const rows = await listItems(filters, client);
        setItems(rows);
      } else {
        const rows = await searchItems(q, filters, client);
        setItems(rows);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [
    client,
    loadState,
    options.query,
    options.typeFilter,
    options.tagFilter,
    options.sort,
    dataVersion,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, error, reload: load };
}
