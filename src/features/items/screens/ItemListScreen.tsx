import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { useAppData } from "../../../app/providers/AppDataProvider";
import type { ItemRecord } from "../../../domain/items/types";
import { CreateNoteForm } from "../../notes/components/CreateNoteForm";
import { SaveLinkForm } from "../../links/components/SaveLinkForm";
import { ImportFileButton } from "../../files/components/ImportFileButton";
import { useSearch } from "../../search/hooks/useSearch";
import { SearchBar } from "../../search/components/SearchBar";
import { SortControl } from "../../search/components/SortControl";
import { TagFilter } from "../../search/components/TagFilter";
import { TypeFilter } from "../../search/components/TypeFilter";
import { listTags } from "../../tags/services/listTags";

export function ItemListScreen() {
  const { loadState, loadError, client, dataVersion } = useAppData();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ItemRecord["type"] | undefined>();
  const [tagFilter, setTagFilter] = useState<string | undefined>();
  const [sort, setSort] = useState<"recent" | "relevance">("recent");
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!client || loadState !== "ready") return;
    void listTags(client).then(setTagOptions);
  }, [client, loadState, dataVersion]);

  const { items, loading, error } = useSearch({
    query,
    typeFilter,
    tagFilter,
    sort,
  });

  if (loadState === "loading") {
    return <p className="page-message">Starting local database…</p>;
  }
  if (loadState === "error") {
    return (
      <p className="page-message error" role="alert">
        {loadError ?? "Could not open database. Run StackDrop in the desktop app (Tauri)."}
      </p>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Items</h1>
        <p className="muted">Browse, capture, and search your saved resources.</p>
      </header>

      <section className="grid-two">
        <CreateNoteForm />
        <SaveLinkForm />
        <ImportFileButton />
      </section>

      <section className="toolbar" aria-label="Search and filters">
        <SearchBar value={query} onChange={setQuery} />
        <TypeFilter value={typeFilter} onChange={setTypeFilter} />
        <TagFilter tags={tagOptions} value={tagFilter} onChange={setTagFilter} />
        <SortControl value={sort} onChange={setSort} />
      </section>

      {loading ? <p className="page-message">Loading…</p> : null}
      {error ? (
        <p className="page-message error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <p className="page-message muted">No items yet. Create a note or link above.</p>
      ) : null}

      <ul className="item-list" data-testid="item-list">
        {items.map((item) => (
          <li key={item.id} className="item-row">
            <Link to={`/items/${item.id}`} className="item-link">
              <span className="item-type">{item.type}</span>
              <span className="item-title">{item.title}</span>
            </Link>
            {item.tags.length > 0 ? <span className="item-tags">{item.tags.join(", ")}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
