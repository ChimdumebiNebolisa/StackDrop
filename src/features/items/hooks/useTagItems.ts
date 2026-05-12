import { useItemList } from "./useItemList";

export function useTagItems(tagName: string | undefined) {
  return useItemList(tagName ? { tag: tagName } : {});
}
