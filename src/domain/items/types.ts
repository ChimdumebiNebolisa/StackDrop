export type ItemType = "note" | "link" | "file";

export type ParseStatus = "not_applicable" | "indexed" | "failed";

export interface ItemRecord {
  id: string;
  type: ItemType;
  title: string;
  sourcePath: string | null;
  sourceUrl: string | null;
  previewText: string | null;
  isIndexed: boolean;
  parseStatus: ParseStatus;
  createdAt: string;
  updatedAt: string;
  collectionId: string | null;
  tags: string[];
}

export interface ItemInsertInput {
  id: string;
  type: ItemType;
  title: string;
  sourcePath?: string | null;
  sourceUrl?: string | null;
  previewText?: string | null;
  isIndexed: boolean;
  parseStatus: ParseStatus;
  createdAt: string;
  updatedAt: string;
  collectionId?: string | null;
}

export interface ItemQueryFilters {
  type?: ItemType;
  tag?: string;
  collectionId?: string;
  sort?: "recent" | "relevance";
}
