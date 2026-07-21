import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { useAppData } from "../../../app/providers/AppDataProvider";
import { FILE_EXTENSION_FILTER_OPTIONS } from "../../../domain/documents/generatedFileCapabilities";
import type { FileExtension, IndexedDocumentRecord, IndexedFolderRecord, ParseStatus, SearchResultRecord } from "../../../domain/documents/types";
import { addIndexedFolder } from "../../folders/services/addIndexedFolder";
import { ensureDefaultLibraryRoots } from "../../folders/services/ensureDefaultLibraryRoots";
import {
  getIndexDiagnostics,
  getUnprocessedFileCount,
  type FolderHealthStatus,
  type FolderIndexDiagnostics,
  type IndexDiagnostics,
} from "../../folders/services/getIndexDiagnostics";
import { listIndexedFolders } from "../../folders/services/listIndexedFolders";
import { removeIndexedFolder } from "../../folders/services/removeIndexedFolder";
import { runAllFolderScans, type LibraryScanSummary } from "../../folders/services/runAllFolderScans";
import { runFolderScan, type FolderScanProgress } from "../../folders/services/runFolderScan";
import { invokeAppHealth, type AppHealthDto } from "../../folders/services/tauriFolderFs";
import { watchIndexedFolders } from "../../folders/services/watchIndexedFolders";
import { queryDocuments } from "../services/queryDocuments";

type ScanPhase = "idle" | "scanning" | "completed" | "completed_with_errors";
type SortMode = "best_match" | "recent_indexed" | "modified_date" | "name_az" | "file_type";
type GroupMode = "none" | "folder" | "file_type" | "parse_status";
type DensityMode = "comfortable" | "compact";

const BACKGROUND_INDEXING_KEY = "stackdrop.backgroundIndexing";

function summarizePhase(summary: LibraryScanSummary | null, phase: ScanPhase): string {
  if (phase === "scanning") return "Scanning...";
  if (phase === "idle" && !summary) return "Idle - click Index library to scan.";
  if (!summary) return "Idle";
  if (summary.rootsTotal === 0) return "No indexed locations - add a folder or reinstall defaults on next launch.";
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

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s elapsed`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s elapsed`;
}

function folderNameFromPath(path: string): string {
  const parts = path.split(/[\\/]+/).filter(Boolean);
  return parts.at(-1) ?? path;
}

function formatScanProgress(progress: FolderScanProgress, nowMs: number): string {
  const elapsed = formatElapsed(nowMs - progress.startedAtMs);
  if (progress.phase === "discovering") {
    return `Discovering files in ${folderNameFromPath(progress.rootPath)} - ${elapsed}`;
  }

  const countText = `${progress.indexed} indexed / ${progress.discovered} discovered`;
  const failedText = progress.failed > 0 ? ` - ${progress.failed} failed` : "";
  if (progress.currentFileName && (progress.phase === "reading" || progress.phase === "parsing")) {
    const phase = progress.phase === "reading" ? "Reading" : "Parsing";
    return `${phase} ${progress.currentFileName} - ${countText}${failedText} - ${elapsed}`;
  }
  if (progress.phase === "indexing" && progress.currentFileName) {
    return `Indexing ${progress.currentFileName} - ${countText}${failedText} - ${elapsed}`;
  }
  if (progress.phase === "finalizing") {
    return `Finalizing ${folderNameFromPath(progress.rootPath)} - ${countText}${failedText} - ${elapsed}`;
  }
  return `Scanning ${folderNameFromPath(progress.rootPath)} - ${countText}${failedText} - ${elapsed}`;
}

function formatDocumentStatusLabel(document: IndexedDocumentRecord): string {
  if (document.parseStatus !== "parse_failed") return formatParseStatusLabel(document.parseStatus);
  if (document.failureStage === "read") return "Read failure";
  if (document.failureStage === "parse") return "Parser failure";
  return "Parse failed";
}

function parseStatusBadgeClass(status: ParseStatus): string {
  if (status === "parsed_ocr") return "badge badge--ocr";
  if (status === "parse_failed") return "badge badge--failed";
  return "badge";
}

function formatDate(value: string | null): string {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatMetadataDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function pathLabel(document: IndexedDocumentRecord): string {
  return document.relativePath || document.absolutePath;
}

function firstSearchTerm(searchText: string): string | null {
  return searchText
    .split(/[^\p{L}\p{N}_]+/u)
    .map((term) => term.trim())
    .find(Boolean) ?? null;
}

function snippetFor(document: SearchResultRecord, searchText: string): { html: string } | { text: string } | null {
  if (document.searchSnippet) {
    const sanitized = document.searchSnippet.replace(/<(?!\/?mark>)[^>]*>/g, "");
    return { html: sanitized };
  }

  const term = firstSearchTerm(searchText);
  const text = document.extractedText?.replace(/\s+/g, " ").trim();
  if (!term || !text || document.parseStatus === "parse_failed") return null;

  const matchIndex = text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
  if (matchIndex < 0) return null;

  const start = Math.max(0, matchIndex - 80);
  const end = Math.min(text.length, matchIndex + term.length + 90);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return { text: `${prefix}${text.slice(start, end)}${suffix}` };
}

function sortDocuments(documents: SearchResultRecord[], sortMode: SortMode): SearchResultRecord[] {
  const out = [...documents];
  if (sortMode === "best_match") return out;

  out.sort((a, b) => {
    if (sortMode === "recent_indexed") {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    if (sortMode === "modified_date") {
      return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
    }
    if (sortMode === "file_type") {
      const byType = a.fileExtension.localeCompare(b.fileExtension);
      return byType || a.fileName.localeCompare(b.fileName);
    }
    return a.fileName.localeCompare(b.fileName);
  });
  return out;
}

function groupLabel(
  document: SearchResultRecord,
  groupMode: GroupMode,
  folderById: Map<string, IndexedFolderRecord>,
): string {
  if (groupMode === "folder") return folderById.get(document.folderId)?.rootPath ?? "Unknown location";
  if (groupMode === "file_type") return document.fileExtension.toUpperCase();
  if (groupMode === "parse_status") return formatParseStatusLabel(document.parseStatus);
  return "Documents";
}

function buildGroups(
  documents: SearchResultRecord[],
  groupMode: GroupMode,
  folderById: Map<string, IndexedFolderRecord>,
): Array<{ label: string; documents: SearchResultRecord[] }> {
  if (groupMode === "none") return [{ label: "Documents", documents }];

  const groups = new Map<string, SearchResultRecord[]>();
  for (const document of documents) {
    const label = groupLabel(document, groupMode, folderById);
    const group = groups.get(label);
    if (group) {
      group.push(document);
    } else {
      groups.set(label, [document]);
    }
  }
  return Array.from(groups, ([label, groupDocuments]) => ({ label, documents: groupDocuments }));
}

function validParseStatus(value: string | null): ParseStatus | "" {
  if (value === "parsed_text" || value === "parsed_ocr" || value === "parse_failed") return value;
  return "";
}

function formatFolderHealth(status: FolderHealthStatus): string {
  if (status === "healthy") return "Healthy";
  if (status === "never_scanned") return "Never scanned";
  if (status === "has_failures") return "Has failures";
  if (status === "scan_incomplete") return "Scan incomplete";
  if (status === "partial_scan") return "Partial scan";
  return "Root issue";
}

function diagnosticStatusClass(status: FolderHealthStatus): string {
  if (status === "healthy") return "badge";
  if (status === "never_scanned") return "badge badge--neutral";
  if (status === "partial_scan") return "badge badge--warning";
  return "badge badge--failed";
}

function formatFailureStageLabel(stage: SearchResultRecord["failureStage"]): string {
  if (stage === "read") return "Read failure";
  if (stage === "parse") return "Parser failure";
  return "Failure details unavailable";
}

function diagnosticLastRunCounts(item: FolderIndexDiagnostics): string | null {
  if (!item.lastRun) return null;
  return `Last run: ${item.lastRun.filesDiscovered} found, ${item.lastRun.filesIndexed} indexed, ${item.lastRun.filesFailed} failed`;
}

function unprocessedCount(item: FolderIndexDiagnostics): number {
  if (!item.lastRun) return 0;
  return getUnprocessedFileCount({
    files_discovered: item.lastRun.filesDiscovered,
    files_indexed: item.lastRun.filesIndexed,
    files_failed: item.lastRun.filesFailed,
  });
}

function formatTimeoutLimit(message: string | null): string {
  const match = message?.match(/after (\d+) seconds/);
  return match ? `${match[1]} seconds` : "the configured time limit";
}

export function DocumentLibraryScreen() {
  const { client, loadState, bumpDataVersion, dataVersion } = useAppData();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [folders, setFolders] = useState<IndexedFolderRecord[]>([]);
  const [documents, setDocuments] = useState<SearchResultRecord[]>([]);
  const [diagnostics, setDiagnostics] = useState<IndexDiagnostics | null>(null);
  const [searchText, setSearchText] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [extensionFilter, setExtensionFilter] = useState<"" | FileExtension>("");
  const [parseFilter, setParseFilter] = useState<"" | ParseStatus>("");
  const [sortMode, setSortMode] = useState<SortMode>("best_match");
  const [groupMode, setGroupMode] = useState<GroupMode>("none");
  const [density, setDensity] = useState<DensityMode>("comfortable");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [lastSummary, setLastSummary] = useState<LibraryScanSummary | null>(null);
  const [activeScanProgress, setActiveScanProgress] = useState<FolderScanProgress | null>(null);
  const [elapsedTickMs, setElapsedTickMs] = useState(() => Date.now());
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

  const searchHasText = searchText.trim().length > 0;
  const filters = useMemo(
    () => ({
      folderId: folderFilter || undefined,
      extension: extensionFilter || undefined,
      parseStatus: parseFilter || undefined,
      sort: searchHasText && sortMode === "best_match" ? ("relevance" as const) : ("recent" as const),
    }),
    [folderFilter, extensionFilter, parseFilter, searchHasText, sortMode],
  );

  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const arrangedDocuments = useMemo(() => sortDocuments(documents, searchHasText ? sortMode : sortMode === "best_match" ? "recent_indexed" : sortMode), [
    documents,
    searchHasText,
    sortMode,
  ]);
  const groupedDocuments = useMemo(() => buildGroups(arrangedDocuments, groupMode, folderById), [arrangedDocuments, folderById, groupMode]);

  useEffect(() => {
    setParseFilter((current) => {
      const next = validParseStatus(searchParams.get("parseStatus"));
      return current === next ? current : next;
    });
  }, [searchParams]);

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }, [location.hash]);

  useEffect(() => {
    if (!client || loadState !== "ready") return;
    void listIndexedFolders(client).then(setFolders);
  }, [client, loadState, dataVersion]);

  useEffect(() => {
    if (!client || loadState !== "ready") return;
    let cancelled = false;
    void getIndexDiagnostics(client).then((nextDiagnostics) => {
      if (!cancelled) setDiagnostics(nextDiagnostics);
    });
    return () => {
      cancelled = true;
    };
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
    if (scanPhase !== "scanning" || !activeScanProgress) return;
    setElapsedTickMs(Date.now());
    const timer = window.setInterval(() => setElapsedTickMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [scanPhase, activeScanProgress]);

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
        setScanPhase("scanning");
        setActiveScanProgress(null);
        let autoFailed = false;
        void runFolderScan(folder.id, client, { onProgress: setActiveScanProgress })
          .catch((watchErr) => {
            autoFailed = true;
            setError(watchErr instanceof Error ? `Auto-index failed: ${watchErr.message}` : "Auto-index failed.");
            setWatchState("error");
            setScanPhase("completed_with_errors");
          })
          .finally(() => {
            autoScanInFlight.current.delete(folder.id);
            scanInFlight.current = false;
            setActiveScanProgress(null);
            if (!autoFailed) setScanPhase("completed");
            bumpDataVersion();
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
    setActiveScanProgress(null);
    setBusy(null);
    try {
      await ensureDefaultLibraryRoots(client);
      const summary = await runAllFolderScans(client, { onProgress: setActiveScanProgress });
      setLastSummary(summary);
      const hasIssues = summary.failed > 0 || summary.errors.length > 0;
      setScanPhase(hasIssues ? "completed_with_errors" : "completed");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setScanPhase("completed_with_errors");
    } finally {
      setActiveScanProgress(null);
      scanInFlight.current = false;
      bumpDataVersion();
    }
  };

  const onAddFolder = async () => {
    if (!client || loadState !== "ready") return;
    if (scanInFlight.current) return;
    scanInFlight.current = true;
    setError(null);
    setBusy("Adding folder...");
    setActiveScanProgress(null);
    try {
      const id = await addIndexedFolder(client);
      if (id) {
        setBusy("Scanning new folder...");
        setScanPhase("scanning");
        await runFolderScan(id, client, { onProgress: setActiveScanProgress });
        setScanPhase("completed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setScanPhase("completed_with_errors");
    } finally {
      setActiveScanProgress(null);
      setBusy(null);
      scanInFlight.current = false;
      bumpDataVersion();
    }
  };

  const onRescan = async (folderId: string) => {
    if (!client || loadState !== "ready") return;
    if (scanInFlight.current) return;
    scanInFlight.current = true;
    setError(null);
    setBusy("Scanning...");
    setScanPhase("scanning");
    setActiveScanProgress(null);
    try {
      await runFolderScan(folderId, client, { onProgress: setActiveScanProgress });
      setScanPhase("completed");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setScanPhase("completed_with_errors");
    } finally {
      setActiveScanProgress(null);
      setBusy(null);
      scanInFlight.current = false;
      bumpDataVersion();
    }
  };

  const removeFolderById = async (folderId: string) => {
    if (!client || loadState !== "ready") return;
    if (!window.confirm("Remove this folder from StackDrop? Files on disk will not be deleted.")) return;
    setError(null);
    setBusy("Removing...");
    try {
      await removeIndexedFolder(folderId, client);
      bumpDataVersion();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onRemoveFolder = async (event: FormEvent, folderId: string) => {
    event.preventDefault();
    await removeFolderById(folderId);
  };

  const onViewFailures = (folderId: string) => {
    setFolderFilter(folderId);
    setParseFilter("parse_failed");
    window.setTimeout(() => document.querySelector(".arrange-toolbar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  if (loadState === "loading" || !client) {
    return <p className="muted">Loading database...</p>;
  }
  if (loadState === "error") {
    return <p className="error">Failed to load database.</p>;
  }

  const statusLine = activeScanProgress ? formatScanProgress(activeScanProgress, elapsedTickMs) : summarizePhase(lastSummary, scanPhase);
  const isBusy = scanPhase === "scanning" || !!busy;
  const hasActiveFilters = searchHasText || folderFilter !== "" || extensionFilter !== "" || parseFilter !== "";
  const failedCount = documents.filter((document) => document.parseStatus === "parse_failed").length;
  const sortSelectValue = !searchHasText && sortMode === "best_match" ? "recent_indexed" : sortMode;
  const partialScanCount = diagnostics?.folders.filter((item) => item.status === "partial_scan").length ?? 0;

  return (
    <div className={`stack document-library document-library--${density}`} id="library">
      <header className="page-header">
        <h1>Documents</h1>
        <p className="muted">Search local documents, review parse status, and manage indexed locations.</p>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {busy ? <p className="muted">{busy}</p> : null}

      <section className="search-panel" aria-label="Search and filters">
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
              {FILE_EXTENSION_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  .{option.value}
                </option>
              ))}
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

      <section className="index-toolbar" aria-labelledby="index-toolbar-heading">
        <span className="sr-only" id="index-toolbar-heading">
          Index controls
        </span>
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
        {scanPhase !== "idle" || lastSummary ? (
          <p className="scan-status" role="status" aria-live="polite">
            {statusLine}
          </p>
        ) : null}
      </section>

      {diagnostics ? (
        <section className="diagnostics-panel" id="diagnostics" aria-labelledby="diagnostics-heading">
          <div className="section-heading-row">
            <div>
              <h2 id="diagnostics-heading">Index Diagnostics</h2>
              <p className="muted">Current index health and recent failures.</p>
            </div>
          </div>
          <div className="diagnostics-summary-grid" aria-label="Index health summary">
            <div className="diagnostic-stat">
              <span>Indexed folders</span>
              <strong>{diagnostics.totals.indexedFolders}</strong>
            </div>
            <div className="diagnostic-stat">
              <span>Total documents</span>
              <strong>{diagnostics.totals.totalDocuments}</strong>
            </div>
            <div className="diagnostic-stat">
              <span>Searchable</span>
              <strong>{diagnostics.totals.searchableDocuments}</strong>
            </div>
            <div className="diagnostic-stat">
              <span>Parser failures</span>
              <strong>{diagnostics.totals.parseFailures}</strong>
            </div>
            <div className="diagnostic-stat">
              <span>Read failures</span>
              <strong>{diagnostics.totals.readFailures}</strong>
            </div>
            <div className="diagnostic-stat">
              <span>Unknown failures</span>
              <strong>{diagnostics.totals.unknownFailures}</strong>
            </div>
            <div className="diagnostic-stat">
              <span>Root issues</span>
              <strong>{diagnostics.totals.rootErrors}</strong>
            </div>
            <div className="diagnostic-stat">
              <span>Partial scans</span>
              <strong>{partialScanCount}</strong>
            </div>
          </div>
          <p className="diagnostics-note">
            Unsupported or skipped files are not tracked in the current index schema; unsupported extensions are filtered during discovery.
          </p>
          <p className="diagnostics-note">
            Failed parses do not break filename or path search. Parser failures mean content could not be extracted; read failures mean the file
            could not be read, often because it is too large, missing, or blocked.
          </p>
          {diagnostics.folders.length === 0 ? (
            <div className="empty-state-block empty-state-block--compact">
              <h3>No indexed folders.</h3>
              <p>Add a folder or index default locations to populate diagnostics.</p>
            </div>
          ) : (
            <ul className="diagnostic-folder-list">
              {diagnostics.folders.map((item) => {
                const failedDocuments = item.parseFailures + item.readFailures + item.unknownFailures;
                const unprocessed = unprocessedCount(item);
                const lastRunCounts = diagnosticLastRunCounts(item);
                const isPartialScan = item.status === "partial_scan";
                const timeoutLimit = formatTimeoutLimit(item.folder.lastError);
                return (
                  <li key={item.folder.id} className="diagnostic-folder-row">
                    <div className="diagnostic-folder-main">
                      <div className="diagnostic-folder-heading">
                        <span className="folder-path" title={item.folder.rootPath}>
                          {item.folder.rootPath}
                        </span>
                        <span className={diagnosticStatusClass(item.status)}>{formatFolderHealth(item.status)}</span>
                      </div>
                      <div className="folder-meta">
                        Last scan: {formatDate(item.folder.lastScanAt)}
                        {lastRunCounts ? `; ${lastRunCounts}` : "; No scan run recorded"}
                      </div>
                      {isPartialScan && item.lastRun ? (
                        <div className="partial-scan-note">
                          <strong>Scan paused after {timeoutLimit} to keep the app responsive.</strong>
                          <span>
                            {item.lastRun.filesIndexed} of {item.lastRun.filesDiscovered} discovered files were indexed before the scan stopped.
                          </span>
                          <span>
                            {unprocessed} file{unprocessed !== 1 ? "s" : ""} {unprocessed === 1 ? "was" : "were"} not processed. Re-scan this folder to retry indexing; unindexed files are prioritized.
                          </span>
                          {item.folder.lastError ? (
                            <details>
                              <summary>Technical details</summary>
                              <small>{item.folder.lastError}</small>
                            </details>
                          ) : null}
                        </div>
                      ) : null}
                      {!isPartialScan && unprocessed > 0 ? (
                        <p className="diagnostic-warning">
                          {unprocessed} discovered file{unprocessed !== 1 ? "s" : ""} {unprocessed === 1 ? "was" : "were"} not processed. Re-scan this folder to retry indexing.
                        </p>
                      ) : null}
                      {!isPartialScan && item.folder.lastError ? (
                        <p className="diagnostic-error">Root error: {item.folder.lastError}</p>
                      ) : null}
                      <div className="diagnostic-folder-actions">
                        <button
                          type="button"
                          className="button-secondary"
                          aria-label={`Scan ${item.folder.rootPath} again`}
                          onClick={() => void onRescan(item.folder.id)}
                          disabled={isBusy}
                        >
                          Re-scan this folder
                        </button>
                        {failedDocuments > 0 ? (
                          <button type="button" className="button-secondary" onClick={() => onViewFailures(item.folder.id)}>
                            View failures
                          </button>
                        ) : null}
                        <button type="button" className="button-danger" onClick={() => void removeFolderById(item.folder.id)} disabled={isBusy}>
                          Remove folder
                        </button>
                      </div>
                    </div>
                    <div className="diagnostic-folder-counts">
                      <span>{item.searchableDocuments} searchable</span>
                      <span>{failedDocuments} failed</span>
                      {unprocessed > 0 ? <span>{unprocessed} unprocessed</span> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {diagnostics.recentFailures.length > 0 ? (
            <div className="recent-failures">
              <h3>Recent failures</h3>
              <ul>
                {diagnostics.recentFailures.map((failure) => (
                  <li key={failure.id}>
                    <Link to={`/documents/${failure.id}`} title={failure.absolutePath}>
                      {failure.fileName}
                    </Link>
                    <span>{formatFailureStageLabel(failure.failureStage)}</span>
                    <small>{failure.parseError ?? failure.relativePath}</small>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="arrange-toolbar" aria-label="Document arrangement controls">
        <div className="results-summary">
          <strong>{documents.length}</strong> result{documents.length !== 1 ? "s" : ""}
          {failedCount > 0 ? <span className="results-summary-failed"> · {failedCount} failed parse{failedCount !== 1 ? "s" : ""}</span> : null}
        </div>
        <div className="filters filters--compact">
          <label className="filter-field">
            <span>Sort by</span>
            <select value={sortSelectValue} onChange={(e) => setSortMode(e.target.value as SortMode)} aria-label="Sort documents">
              {searchHasText ? <option value="best_match">Best match</option> : null}
              <option value="recent_indexed">Recently indexed</option>
              <option value="modified_date">Modified date</option>
              <option value="name_az">Name A-Z</option>
              <option value="file_type">File type</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Group by</span>
            <select value={groupMode} onChange={(e) => setGroupMode(e.target.value as GroupMode)} aria-label="Group documents">
              <option value="none">None</option>
              <option value="folder">Folder</option>
              <option value="file_type">File type</option>
              <option value="parse_status">Parse status</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Density</span>
            <select value={density} onChange={(e) => setDensity(e.target.value as DensityMode)} aria-label="Set view density">
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
        </div>
      </section>

      {documents.length === 0 ? (
        hasActiveFilters ? (
          <div className="empty-state-block">
            <h3>No documents matched this search.</h3>
            <p>Try a different filename, phrase, file type, or parse-status filter.</p>
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
        <div className="doc-list" data-testid="document-list">
          {groupedDocuments.map((group) => (
            <section key={group.label} className="doc-group" aria-label={groupMode === "none" ? "Documents" : group.label}>
              {groupMode !== "none" ? (
                <h2 className="doc-group-heading">
                  {group.label}
                  <span>{group.documents.length}</span>
                </h2>
              ) : null}
              <ul className="doc-group-list">
                {group.documents.map((d) => {
                  const snippet = snippetFor(d, searchText);
                  return (
                    <li key={d.id} className={`doc-row${d.parseStatus === "parse_failed" ? " doc-row--failed" : ""}`}>
                      <Link to={`/documents/${d.id}`} className="doc-link" title={d.absolutePath}>
                        <div className="doc-row-main">
                          <div className="doc-badges">
                            <span className="badge">{d.fileExtension.toUpperCase()}</span>
                            <span className={parseStatusBadgeClass(d.parseStatus)}>{formatDocumentStatusLabel(d)}</span>
                          </div>
                          <span className="doc-name">{d.fileName}</span>
                          <span className="doc-path">
                            {d.parseStatus === "parse_failed"
                              ? d.failureStage === "read"
                                ? "Could not read file. Open details for error."
                                : "Could not extract searchable text. Open details for error."
                              : pathLabel(d)}
                          </span>
                          {snippet && "html" in snippet
                            ? <span className="doc-snippet" dangerouslySetInnerHTML={{ __html: snippet.html }} />
                            : snippet && "text" in snippet
                              ? <span className="doc-snippet">{snippet.text}</span>
                              : null}
                        </div>
                        <div className="doc-meta">
                          <span>Modified {formatMetadataDate(d.modifiedAt)}</span>
                          <span>Indexed {formatMetadataDate(d.updatedAt)}</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section className="locations-panel" id="locations" aria-labelledby="locations-heading">
        <div className="section-heading-row">
          <div>
            <h2 id="locations-heading">Locations</h2>
            <p className="muted">
              StackDrop indexes Documents, Desktop, and Downloads by default when available. It does not index the entire computer by default.
            </p>
            <p className="muted">
              Add any folder you want, including larger parent folders. Larger folders can take longer to index.
            </p>
          </div>
          <button type="button" className="button-secondary" onClick={() => void onAddFolder()} disabled={isBusy}>
            Add folder
          </button>
        </div>
        {folders.length === 0 ? (
          <div className="empty-state-block empty-state-block--compact">
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
                  <div className="folder-meta">Last scan: {formatDate(f.lastScanAt)}</div>
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
      </section>

      <section className="settings-panel" id="settings" aria-labelledby="settings-heading">
        <div>
          <h2 id="settings-heading">Settings</h2>
          <p className="muted">Control indexing behavior and view density for this library.</p>
        </div>
        <div className="settings-grid">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={backgroundIndexing}
              onChange={(event) => setBackgroundIndexing(event.target.checked)}
              aria-label="Auto-index while open from settings"
            />
            <span>
              <strong>Auto-index while open</strong>
              <small>Watch indexed folders and refresh changed documents while StackDrop is running.</small>
            </span>
          </label>
          <div className="settings-control">
            <span>View density</span>
            <select value={density} onChange={(e) => setDensity(e.target.value as DensityMode)} aria-label="Set settings view density">
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </div>
        </div>
      </section>

      <section className="about-panel" id="about" aria-labelledby="about-heading">
        <h2 id="about-heading">About</h2>
        <p className="muted">
          StackDrop is a local-first document search utility for supported text, PDF, DOCX, and DOC files. Files stay on this computer.
        </p>
        <p className="muted">
          {shellHealth ? `Shell ${shellHealth.ok ? "OK" : "issue"} · v${shellHealth.packageVersion}` : "Shell status unavailable"}
        </p>
      </section>
    </div>
  );
}
