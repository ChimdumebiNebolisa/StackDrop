import { Link, Outlet } from "react-router-dom";
import { FormEvent, useEffect, useState } from "react";

import { useAppData } from "../providers/AppDataProvider";
import { createCollection } from "../../features/collections/services/createCollection";
import { listCollections } from "../../features/collections/services/listCollections";
import { listTags } from "../../features/tags/services/listTags";

export function AppShell() {
  const { client, loadState, bumpDataVersion, dataVersion } = useAppData();
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newCollectionName, setNewCollectionName] = useState("");

  useEffect(() => {
    if (!client || loadState !== "ready") return;
    void (async () => {
      setCollections(await listCollections(client));
      setTags(await listTags(client));
    })();
  }, [client, loadState, dataVersion]);

  const onCreateCollection = async (event: FormEvent) => {
    event.preventDefault();
    if (!client || loadState !== "ready" || !newCollectionName.trim()) return;
    await createCollection(newCollectionName, client);
    setNewCollectionName("");
    setCollections(await listCollections(client));
    bumpDataVersion();
  };

  return (
    <div className="layout-root">
      <aside className="layout-sidebar" aria-label="Navigation">
        <div className="brand">StackDrop</div>
        <nav className="nav-block">
          <Link to="/" className="nav-link">
            All items
          </Link>
        </nav>
        <nav className="nav-block">
          <div className="nav-heading">Collections</div>
          {collections.length === 0 ? (
            <p className="nav-muted">None yet</p>
          ) : (
            collections.map((collection) => (
              <Link key={collection.id} to={`/collections/${collection.id}`} className="nav-link">
                {collection.name}
              </Link>
            ))
          )}
          <form className="nav-form" onSubmit={onCreateCollection}>
            <input
              placeholder="New collection"
              value={newCollectionName}
              onChange={(event) => setNewCollectionName(event.target.value)}
              aria-label="New collection name"
            />
            <button type="submit">Add</button>
          </form>
        </nav>
        <nav className="nav-block">
          <div className="nav-heading">Tags</div>
          {tags.length === 0 ? (
            <p className="nav-muted">None yet</p>
          ) : (
            tags.map((tag) => (
              <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`} className="nav-link">
                {tag}
              </Link>
            ))
          )}
        </nav>
      </aside>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
