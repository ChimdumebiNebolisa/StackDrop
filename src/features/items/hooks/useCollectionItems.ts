import { useItemList } from "./useItemList";

export function useCollectionItems(collectionId: string | undefined) {
  return useItemList(collectionId ? { collectionId } : {});
}
