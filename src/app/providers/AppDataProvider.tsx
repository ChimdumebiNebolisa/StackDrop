import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { runMigrations } from "../../data/db/migrate";
import { getAppSqlClient, type SqlClient } from "../../data/db/sqliteClient";

type LoadState = "loading" | "ready" | "error";

interface AppDataContextValue {
  client: SqlClient | null;
  loadState: LoadState;
  loadError: string | null;
  dataVersion: number;
  bumpDataVersion: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<SqlClient | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const bumpDataVersion = useCallback(() => {
    setDataVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sql = await getAppSqlClient();
        await runMigrations(sql);
        if (!cancelled) {
          setClient(sql);
          setLoadState("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadState("error");
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      client,
      loadState,
      loadError,
      dataVersion,
      bumpDataVersion,
    }),
    [client, loadState, loadError, dataVersion, bumpDataVersion],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return ctx;
}
