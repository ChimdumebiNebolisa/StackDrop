import { Link, useParams } from "react-router-dom";

import { CollectionAssigner } from "../../collections/components/CollectionAssigner";
import { TagEditor } from "../../tags/components/TagEditor";
import { EditTitleControl } from "../components/EditTitleControl";
import { RemoveItemControl } from "../components/RemoveItemControl";
import { useItemDetail } from "../hooks/useItemDetail";

export function ItemDetailScreen() {
  const { id } = useParams();
  const { detail, loading, error } = useItemDetail(id);

  if (loading) {
    return <p className="page-message">Loading…</p>;
  }
  if (error) {
    return (
      <p className="page-message error" role="alert">
        {error}
      </p>
    );
  }
  if (!detail) {
    return (
      <div className="page">
        <p className="page-message">Item not found.</p>
        <Link to="/">Back to items</Link>
      </div>
    );
  }

  const { item } = detail;

  return (
    <div className="page detail-page">
      <Link to="/" className="back-link" data-testid="back-to-list">
        ← All items
      </Link>
      <header className="page-header">
        <p className="eyebrow">{item.type}</p>
        <h1>{item.title}</h1>
      </header>

      <section className="detail-meta">
        <p>
          <strong>Indexed:</strong> {item.isIndexed ? "yes" : "no"} · <strong>Parse:</strong> {item.parseStatus}
        </p>
        {item.sourcePath ? (
          <p>
            <strong>Source file:</strong> {item.sourcePath}
          </p>
        ) : null}
        {item.sourceUrl ? (
          <p>
            <strong>URL:</strong>{" "}
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">
              {item.sourceUrl}
            </a>
          </p>
        ) : null}
      </section>

      {"note" in detail && detail.note ? (
        <section className="detail-body">
          <h2>Note</h2>
          <pre className="note-body" data-testid="note-body">
            {detail.note.body}
          </pre>
        </section>
      ) : null}

      {"link" in detail && detail.link ? (
        <section className="detail-body">
          <h2>Link</h2>
          <p>
            <a href={detail.link.url} target="_blank" rel="noreferrer" data-testid="link-url">
              {detail.link.url}
            </a>
          </p>
        </section>
      ) : null}

      {"file" in detail && detail.file ? (
        <section className="detail-body">
          <h2>File preview</h2>
          <p className="muted">
            {detail.file.filePath} ({detail.file.fileExtension})
          </p>
          <pre className="note-body" data-testid="file-preview">
            {detail.file.extractedText ?? "(No extracted text — not indexed or empty.)"}
          </pre>
        </section>
      ) : null}

      <section className="card form-card">
        <h2 className="card-title">Organize</h2>
        <EditTitleControl key={item.updatedAt} itemId={item.id} initialTitle={item.title} />
        <TagEditor key={item.tags.join(",")} itemId={item.id} initialTags={item.tags} />
        <CollectionAssigner itemId={item.id} currentCollectionId={item.collectionId} />
      </section>

      <RemoveItemControl itemId={item.id} />
    </div>
  );
}
