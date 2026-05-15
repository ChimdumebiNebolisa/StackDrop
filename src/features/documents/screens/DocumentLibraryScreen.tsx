import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useAppData } from "../../../app/providers/AppDataProvider";
import type { FileExtension, IndexedDocumentRecord, IndexedFolderRecord, ParseStatus } from "../../../domain/documents/types";
import { addIndexedFolder } from "../../folders/services/addIndexedFolder";
import { ensureDefaultLibraryRoots } from "../../folders/services/ensureDefaultLibraryRoots";
import { listIndexedFolders } from "../../folders/services/listIndexedFolders";
import { removeIndexedFolder } from "../../folders/services/removeIndexedFolder";
import { runAllFolderScans, type LibraryScanSummary } from "../../folders/services/runAllFolderScans";
import { runFolderScan } from "../../folders/services/runFolderScan";
import { invokeAppHealth, type AppHealthDto } from "../../folders/services/tauriFolderFs";
import { watchIndexedFolders } from "../../folders/services/watchIndexedFolders";
import { queryDocuments } from "../services/queryDocuments";

type ScanPhase = "idle" | "scanning" | "completed" | "completed_with_errors";

function summarizePhase(summary: LibraryScanSummary | null, phase: ScanPhase): string {
  if (phase === "scanning") return "Scanning…";
  if (phase === "idle" && !summary) return "Idle — click Index library to scan.";
  if (!summary) return "Idle";
  if (summary.rootsTotal === 0) return "No indexed locations — add a folder or reinstall defaults on next launch.";
  const base = `Last run: ${summary.discovered} file(s) found, ${summary.indexed} indexed, ${summary.failed} failed across ${summary.rootsCompleted} location(s).`;
  if (phase === "completed_with_errors" || summary.errors.length > 0) {
    return `${base} Warnings: ${summary.errors.join("; ") || "parse/read failures"}.`;
  }
  return `${base} Completed.`;
}

function formatParseStatusLabel(status: ParseStatus): string {
  if (status === "parsed_text") return "Parsed text";
  if (status === "parsed_ocr") return "Parsed OCR";
  return "Parse failed";
}

function parseStatusBadgeClass(status: ParseStatus): string {
  if (status === "parsed_ocr") return "badge badge--ocr";
  if (status === "parse_failed") return "badge badge--failed";
  return "badge";
}

const BACKGROUND_INDEXING_KEY = "stackdrop.backgroundIndexing";

export function DocumentLibraryScreen() {
  const { client, loadState, bumpDataVersion, dataVersion } = useAppData();
  const [folders, setFolders] = useState<IndexedFolderRecord[]>([]);
  const [documents, setDocuments] = useState<IndexedDocumentRecord[]>([]);
  const [searchText, setSearchText] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [extensionFilter, setExtensionFilter] = useState<"" | FileExtension>("");
  const [parseFilter, setParseFilter] = useState<"" | ParseStatus>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [lastSummary, setLastSummary] = useState<LibraryScanSummary | null>(null);
  const [shellHealth, setShellHealth] = useState<AppHealthDto | null>(null);
  const [watchState, setWatchState] = useState<"idle" | "watching" | "error">("idle");
  const [backgroundIndexing, setBackgroundIndexing] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(BACKGROUND_INDEXING_KEY);
    if (raw === null) return true;
    return raw === "true";
  });
  const autoScanInFlight = useRef(new Set<string>());
  const scanInFlight = useRef(false);
  const scanPhaseRef = useRef<ScanPhase>("idle");

  const filters = useMemo(
    () => ({
      folderId: folderFilter || undefined,
      extension: extensionFilter || undefined,
      parseStatus: parseFilter || undefined,
      sort: "recent" as const,
    }),
    [folderFilter, extensionFilter, parseFilter],
  );

  useEffect(() => {
    if (!client || loadState !== "ready") return;
    void listIndexedFolders(client).then(setFolders);
  }, [client, loadState, dataVersion]);

  useEffect(() => {
    if (!client || loadState !== "ready") return;
    void queryDocuments(client, searchText, filters).then(setDocuments);
  }, [client, loadState, dataVersion, searchText, filters]);

  useEffect(() => {
    void invokeAppHealth()
      .then(setShellHealth)
      .catch(() => setShellHealth(null));
  }, []);

  useEffect(() => {
    scanPhaseRef.current = scanPhase;
  }, [scanPhase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BACKGROUND_INDEXING_KEY, String(backgroundIndexing));
  }, [backgroundIndexing]);

  useEffect(() => {
    if (!client || loadState !== "ready") return;
    if (!backgroundIndexing) {
      setWatchState("idle");
      return;
    }
    let cancelled = false;
    let stopWatcher: (() => Promise<void>) | null = null;
    setWatchState("idle");

    void watchIndexedFolders(folders, {
      onFolderDirty: (folder) => {
        if (!folder.lastScanAt) return false;
        if (scanInFlight.current) return false;
        if (scanPhaseRef.current === "scanning") return false;
        if (autoScanInFlight.current.has(folder.id)) return false;
        scanInFlight.current = true;
        autoScanInFlight.current.add(folder.id);
        void runFolderScan(folder.id, client)
          .then(() => bumpDataVersion())
          .catch((watchErr) => {
            setError(watchErr instanceof Error ? `Auto-index failed: ${watchErr.message}` : "Auto-index failed.");
            setWatchState("error");
          })
          .finally(() => {
            autoScanInFlight.current.delete(folder.id);
            scanInFlight.current = false;
          });
        return true;
      },
    })
      .then((stop) => {
        if (cancelled) {
          void stop();
          return;
        }
        stopWatcher = stop;
        setWatchState(folders.length > 0 ? "watching" : "idle");
      })
      .catch(() => setWatchState("error"));

    return () => {
      cancelled = true;
      autoScanInFlight.current.clear();
      if (stopWatcher) {
        void stopWatcher();
      }
    };
  }, [client, loadState, folders, bumpDataVersion, backgroundIndexing]);

  const onIndexLibrary = async () => {
    if (!client || loadState !== "ready") return;
    if (scanInFlight.current) return;
    scanInFlight.current = true;
    setError(null);
    setScanPhase("scanning");
    setBusy(null);
    try {
      await ensureDefaultLibraryRoots(client);
      const summary = await runAllFolderScans(client);
      setLastSummary(summary);
      const hasIssues = summary.failed > 0 || summary.errors.length > 0;
      setScanPhase(hasIssues ? "completed_with_errors" : "completed");
      bumpDataVersion();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setScanPhase("completed_with_errors");
    } finally {
      scanInFlight.current = false;
    }
  };

  const onAddFolder = async () => {
    if (!client || loadState !== "ready") return;
    if (scanInFlight.current) return;
    scanInFlight.current = true;
    setError(null);
    setBusy("Adding folder…");
    try {
      const id = await addIndexedFolder(client);
      if (id) {
        setBusy("Scanning new folder…");
        await runFolderScan(id, client);
      }
      bumpDataVersion();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      scanInFlight.current = false;
    }
  };

  const onRescan = async (folderId: string) => {
    if (!client || loadState !== "ready") return;
    if (scanInFlight.current) return;
    scanInFlight.current = true;
    setError(null);
    setBusy("Scanning…");
    setScanPhase("scanning");
    try {
      await runFolderScan(folderId, client);
      setScanPhase("completed");
      bumpDataVersion();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setScanPhase("completed_with_errors");
    } finally {
      setBusy(null);
      scanInFlight.current = false;
    }
  };

  const onRemoveFolder = async (event: FormEvent, folderId: string) => {
    event.preventDefault();
    if (!client || loadState !== "ready") return;
    if (!window.confirm("Remove this folder from StackDrop? Files on disk will not be deleted.")) return;
    setError(null);
    setBusy("Removing…");
    try {
      await removeIndexedFolder(folderId, client);
      bumpDataVersion();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (loadState === "loading" || !client) {
    return <p className="muted">Loading database…</p>;
  }
  if (loadState === "error") {
    return <p className="error">Failed to load database.</p>;
  }

  const statusLine = summarizePhase(lastSummary, scanPhase);
  const isBusy = scanPhase === "scanning" || !!busy;
  const hasActiveFilters = searchText.trim().length > 0 || folderFilter !== "" || extensionFilter !== "" || parseFilter !== "";

  return (
    <div className="stack">
      {/* ── Page header ────────────────────────────────────────── */}
      <header className="page-header">
        <h1>Documents</h1>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {busy ? <p className="muted">{busy}</p> : null}

      {/* ── Search panel ───────────────────────────────────────── */}
      <section className="search-panel" aria-labelledby="search-heading">
        <label htmlFor="search-input" className="sr-only" id="search-heading">
          Search documents
        </label>
        <input
          id="search-input"
          className="search-input"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search file name or document content"
          aria-label="Search documents"
        />
        <div className="filters">
          <label className="filter-field">
            <span>Location</span>
            <select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} aria-label="Filter by indexed location">
              <option value="">All locations</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.rootPath}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Type</span>
            <select
              value={extensionFilter}
              onChange={(e) => setExtensionFilter(e.target.value as "" | FileExtension)}
              aria-label="Filter by file type"
            >
              <option value="">All types</option>
              <option value="txt">.txt</option>
              <option value="pdf">.pdf</option>
              <option value="docx">.docx</option>
              <option value="doc">.doc</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Parse status</span>
            <select
              value={parseFilter}
              onChange={(e) => setParseFilter(e.target.value as "" | ParseStatus)}
              aria-label="Filter by parse status"
            >
              <option value="">All</option>
              <option value="parsed_text">Parsed (text)</option>
              <option value="parsed_ocr">Parsed (OCR)</option>
              <option value="parse_failed">Parse failed</option>
            </select>
          </label>
        </div>
      </section>

      {/* ── Compact index toolbar ──────────────────────────────── */}
      <section className="index-toolbar" aria-labelledby="index-toolbar-heading">
        <span className="sr-only" id="index-toolbar-heading">Index controls</span>
        <span className="index-toolbar-status">
          {folders.length} indexed location{folders.length !== 1 ? "s" : ""}
          {shellHealth ? ` · Shell ${shellHealth.ok ? "OK" : "issue"} (v${shellHealth.packageVersion})` : null}
          {backgroundIndexing && watchState === "watching" && folders.length > 0 ? " · Watching indexed folders" : null}
          {watchState === "error" ? " · File watcher unavailable" : null}
        </span>
        <div className="index-toolbar-actions">
          <button type="button" className="button-primary" onClick={() => void onIndexLibrary()} disabled={isBusy}>
            Index library
          </button>
          <button type="button" className="button-secondary" onClick={() => void onAddFolder()} disabled={isBusy}>
            Add folder
          </button>
          <label className="index-toolbar-toggle">
            <input
              type="checkbox"
              checked={backgroundIndexing}
              onChange={(event) => setBackgroundIndexing(event.target.checked)}
              aria-label="Auto-index while open"
            />
            <span>Auto-index while open</span>
          </label>
        </div>
        {(scanPhase !== "idle" || lastSummary) ? (
          <p className="scan-status" role="status" aria-live="polite">
            {statusLine}
          </p>
        ) : null}
      </section>

      {/* ── Results list ───────────────────────────────────────── */}
      {documents.length === 0 ? (
        hasActiveFilters ? (
          <div className="empty-state-block">
            <h3>No documents matched this search.</h3>
            <p>Try a different filename, phrase, file type, or parse-status filter.</p>
          </div>
        ) : folders.length === 0 ? (
          <div className="empty-state-block">
            <h3>No indexed documents yet.</h3>
            <p>Index your library to search Documents, Desktop, Downloads, and any folders you add.</p>
            <button type="button" className="button-primary" onClick={() => void onIndexLibrary()} disabled={isBusy}>
              Index library
            </button>
          </div>
        ) : (
          <div className="empty-state-block">
            <h3>No indexed documents yet.</h3>
            <p>Index your library to search Documents, Desktop, Downloads, and any folders you add.</p>
            <button type="button" className="button-primary" onClick={() => void onIndexLibrary()} disabled={isBusy}>
              Index library
            </button>
          </div>
        )
      ) : (
        <ul className="doc-list" data-testid="document-list">
          {documents.map((d) => (
            <li key={d.id} className={`doc-row${d.parseStatus === "parse_failed" ? " doc-row--failed" : ""}`}>
              <Link to={`/documents/${d.id}`} className="doc-link">
                <div className="doc-badges">
                  <span className="badge">{d.fileExtension.toUpperCase()}</span>
                  <span className={parseStatusBadgeClass(d.parseStatus)}>
                    {formatParseStatusLabel(d.parseStatus)}
                  </span>
                </div>
                <span className="doc-name">{d.fileName}</span>
                <span className="doc-path">
                  {d.parseStatus === "parse_failed"
                    ? "Could not extract searchable text. Open details for error."
                    : d.absolutePath}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* ── Manage indexed locations ───────────────────────────── */}
      <details className="locations-disclosure">
        <summary>
          Manage indexed locations ({folders.length})
        </summary>
        <div className="locations-body">
          {folders.length === 0 ? (
            <div className="empty-state-block">
              <h3>No indexed locations.</h3>
              <p>Add a folder or index the default library locations.</p>
            </div>
          ) : (
            <ul className="folder-list">
              {folders.map((f) => (
                <li key={f.id} className="folder-row">
                  <div>
                    <div className="folder-path" title={f.rootPath}>
                      {f.rootPath}
                    </div>
                    <div className="folder-meta">
                      Last scan: {f.lastScanAt ? new Date(f.lastScanAt).toLocaleString() : "never"}
                    </div>
                  </div>
                  <div className="folder-actions">
                    <button type="button" className="button-secondary" onClick={() => void onRescan(f.id)} disabled={isBusy}>
                      Re-scan
                    </button>
                    <form onSubmit={(e) => void onRemoveFolder(e, f.id)}>
                      <button type="submit" className="button-danger" disabled={isBusy}>
                        Remove from StackDrop
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}
