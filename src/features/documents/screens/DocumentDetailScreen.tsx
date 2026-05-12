import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAppData } from "../../../app/providers/AppDataProvider";
import type { IndexedDocumentRecord } from "../../../domain/documents/types";
import { getDocumentDetail } from "../services/getDocumentDetail";

export function DocumentDetailScreen() {
  const { id } = useParams();
  const { client, loadState } = useAppData();
  const [doc, setDoc] = useState<IndexedDocumentRecord | null | undefined>(undefined);

  useEffect(() => {
    if (!client || loadState !== "ready" || !id) return;
    void getDocumentDetail(id, client).then(setDoc);
  }, [client, loadState, id]);

  if (loadState === "loading" || !client) {
    return <p className="muted">Loading…</p>;
  }
  if (doc === undefined) {
    return <p className="muted">Loading document…</p>;
  }
  if (!doc) {
    return (
      <div>
        <p>Document not found.</p>
        <Link to="/">Back to library</Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <Link to="/">← Back</Link>
      <h1>{doc.fileName}</h1>
      <dl className="meta-grid">
        <dt>Path</dt>
        <dd>
          <code>{doc.absolutePath}</code>
        </dd>
        <dt>Relative path</dt>
        <dd>{doc.relativePath}</dd>
        <dt>Extension</dt>
        <dd>{doc.fileExtension}</dd>
        <dt>Size</dt>
        <dd>{doc.sizeBytes} bytes</dd>
        <dt>Modified</dt>
        <dd>{new Date(doc.modifiedAt).toLocaleString()}</dd>
        <dt>Parse status</dt>
        <dd>{doc.parseStatus}</dd>
        {doc.parseError ? (
          <>
            <dt>Parse error</dt>
            <dd className="error">{doc.parseError}</dd>
          </>
        ) : null}
      </dl>
      <section className="card" aria-labelledby="preview-heading">
        <h2 id="preview-heading">Extracted text preview</h2>
        {doc.extractedText ? <pre className="preview">{doc.extractedText}</pre> : <p className="muted">No extracted text.</p>}
      </section>
    </div>
  );
}
