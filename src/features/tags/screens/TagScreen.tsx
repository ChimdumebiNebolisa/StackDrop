import { Link, useParams } from "react-router-dom";

import type { ItemRecord } from "../../../domain/items/types";
import { useTagItems } from "../../items/hooks/useTagItems";

export function TagScreen() {
  const { tagName } = useParams();
  const decoded = tagName ? decodeURIComponent(tagName) : "";
  const { items, loading, error } = useTagItems(decoded || undefined);

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← All items
      </Link>
      <header className="page-header">
        <h1>Tag: {decoded}</h1>
        <p className="muted">Items with this tag.</p>
      </header>
      {loading ? <p className="page-message">Loading…</p> : null}
      {error ? (
        <p className="page-message error" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <p className="page-message muted">No items with this tag.</p>
      ) : null}
      <ul className="item-list">
        {items.map((item: ItemRecord) => (
          <li key={item.id} className="item-row">
            <Link to={`/items/${item.id}`} className="item-link">
              <span className="item-type">{item.type}</span>
              <span className="item-title">{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
