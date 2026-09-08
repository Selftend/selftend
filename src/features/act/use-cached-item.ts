/**
 * What a list hook caches: the bare array of a plain `useQuery` list, or the
 * `{ pages }` envelope of a `useInfiniteQuery` archive.
 */
type ListData<T> = T[] | { pages: T[][] } | undefined;

function rows<T>(data: ListData<T>): T[] | undefined {
  if (!data) return undefined;
  return Array.isArray(data) ? data : data.pages.flat();
}

/**
 * Look the item up in the list cache first; only fetch it on its own when the list
 * isn't available (e.g. cold-load on a detail URL).
 *
 * ☠️ Hand this the hook the LIST SCREEN mounts, not the one that happens to share a
 * type. The archive rewrite (#1517) moved every ACT list screen onto a `*Pages`
 * infinite query under its own key, while the detail screens went on probing the plain
 * list hooks the pre-rewrite screens had filled — so every list-to-detail hop missed,
 * mounted a spinner when the entry was absent, and fired a list read no surface rendered
 * (#2190). The probe pays for itself only when it hits, and it hits only on the entry the
 * list screen actually wrote.
 */
export function useCachedItem<T extends { id: string }>(
  useList: (userId: string | null) => { data: ListData<T> },
  useItem: (
    userId: string | null,
    itemId: string | null,
  ) => { data: T | null | undefined; isLoading: boolean },
  userId: string | null,
  itemId: string | null,
) {
  const { data: cachedList } = useList(userId);
  const fromCache = itemId
    ? (rows(cachedList)?.find((entry) => entry.id === itemId) ?? null)
    : null;
  const { data: fetched, isLoading } = useItem(
    fromCache ? null : userId,
    fromCache ? null : itemId,
  );
  return {
    item: fromCache ?? fetched ?? null,
    isLoading: !fromCache && isLoading,
  };
}
