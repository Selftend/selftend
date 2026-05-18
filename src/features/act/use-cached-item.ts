import { useMemo } from "react";

// Look up the item in the list cache first; only fetch it on its own
// when the list isn't available (e.g. cold-load on a detail URL).
export function useCachedItem<T extends { id: string }>(
  useList: (userId: string | null) => { data: T[] | undefined },
  useItem: (
    userId: string | null,
    itemId: string | null,
  ) => { data: T | null | undefined; isLoading: boolean },
  userId: string | null,
  itemId: string | null,
) {
  const { data: cachedList } = useList(userId);
  const fromCache = useMemo(
    () => (itemId ? (cachedList?.find((entry) => entry.id === itemId) ?? null) : null),
    [cachedList, itemId],
  );
  const { data: fetched, isLoading } = useItem(
    fromCache ? null : userId,
    fromCache ? null : itemId,
  );
  return {
    item: fromCache ?? fetched ?? null,
    isLoading: !fromCache && isLoading,
  };
}
