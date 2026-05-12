import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAppData } from "../../../app/providers/AppDataProvider";
import type { FileExtension, IndexedDocumentRecord, IndexedFolderRecord, ParseStatus } from "../../../domain/documents/types";
import { addIndexedFolder } from "../../folders/services/addIndexedFolder";
import { listIndexedFolders } from "../../folders/services/listIndexedFolders";
import { removeIndexedFolder } from "../../folders/services/removeIndexedFolder";
import { runFolderScan } from "../../folders/services/runFolderScan";
import { queryDocuments } from "../services/queryDocuments";

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

  const onAddFolder = async () => {
    if (!client || loadState !== "ready") return;
    setError(null);
    setBusy("Adding folder…");
    try {
      const id = await addIndexedFolder(client);
      if (id) {
        setBusy("Scanning…");
        await runFolderScan(id, client);
      }
      bumpDataVersion();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onRescan = async (folderId: string) => {
    if (!client || loadState !== "ready") return;
    setError(null);
    setBusy("Scanning…");
    try {
      await runFolderScan(folderId, client);
      bumpDataVersion();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
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

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Documents</h1>
        <p className="muted">Indexed folders: {folders.length}</p>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {busy ? <p className="muted">{busy}</p> : null}

      <section className="card" aria-labelledby="folders-heading">
        <h2 id="folders-heading">Indexed folders</h2>
        <button type="button" onClick={() => void onAddFolder()} disabled={!!busy}>
          Add folder…
        </button>
        {folders.length === 0 ? (
          <p className="muted">No folders yet. Add a folder to begin indexing.</p>
        ) : (
          <ul className="folder-list">
            {folders.map((f) => (
              <li key={f.id} className="folder-row">
                <div>
                  <div className="folder-path" title={f.rootPath}>
                    {f.rootPath}
                  </div>
                  <div className="muted small">
                    Last scan: {f.lastScanAt ? new Date(f.lastScanAt).toLocaleString() : "never"}
                  </div>
                </div>
                <div className="folder-actions">
                  <button type="button" onClick={() => void onRescan(f.id)} disabled={!!busy}>
                    Re-scan
                  </button>
                  <form onSubmit={(e) => void onRemoveFolder(e, f.id)}>
                    <button type="submit" disabled={!!busy}>
                      Remove from StackDrop
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="browse-heading">
        <h2 id="browse-heading">Browse &amp; search</h2>
        <label className="field">
          <span>Search</span>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="File name or content"
            aria-label="Search documents"
          />
        </label>
        <div className="filters">
          <label className="field">
            <span>Folder</span>
            <select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} aria-label="Filter by folder">
              <option value="">All folders</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.rootPath}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Type</span>
            <select
              value={extensionFilter}
              onChange={(e) => setExtensionFilter(e.target.value as "" | FileExtension)}
              aria-label="Filter by file type"
            >
              <option value="">All types</option>
              <option value="txt">.txt</option>
              <option value="md">.md</option>
              <option value="pdf">.pdf</option>
            </select>
          </label>
          <label className="field">
            <span>Parse status</span>
            <select
              value={parseFilter}
              onChange={(e) => setParseFilter(e.target.value as "" | ParseStatus)}
              aria-label="Filter by parse status"
            >
              <option value="">All</option>
              <option value="indexed">Indexed</option>
              <option value="failed">Failed</option>
            </select>
          </label>
        </div>

        {documents.length === 0 ? (
          <p className="muted">No documents match the current filters.</p>
        ) : (
          <ul className="doc-list" data-testid="document-list">
            {documents.map((d) => (
              <li key={d.id}>
                <Link to={`/documents/${d.id}`} className="doc-link">
                  <span className="doc-name">{d.fileName}</span>
                  <span className="muted small">
                    {" "}
                    · {d.fileExtension} · {d.parseStatus}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
