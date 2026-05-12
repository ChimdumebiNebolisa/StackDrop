import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { useAppData } from "../../../app/providers/AppDataProvider";
import type { ItemRecord } from "../../../domain/items/types";
import { listCollections } from "../../collections/services/listCollections";
import { useCollectionItems } from "../../items/hooks/useCollectionItems";

export function CollectionScreen() {
  const { collectionId } = useParams();
  const { client, loadState } = useAppData();
  const [title, setTitle] = useState("Collection");
  const { items, loading, error } = useCollectionItems(collectionId);

  useEffect(() => {
    if (!client || !collectionId || loadState !== "ready") return;
    void listCollections(client).then((rows) => {
      const match = rows.find((row) => row.id === collectionId);
      if (match) setTitle(match.name);
    });
  }, [client, collectionId, loadState]);

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← All items
      </Link>
      <header className="page-header">
        <h1>{title}</h1>
        <p className="muted">Items in this collection.</p>
      </header>
      {loading ? <p className="page-message">Loading…</p> : null}
      {error ? (
        <p className="page-message error" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <p className="page-message muted">No items in this collection.</p>
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
