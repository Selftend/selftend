import { useState } from "react";

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
 *
 * ☠️ A row this hook has painted stays painted across a cache MISS (#2257). The probe
 * can lose its row for a moment without the row being gone: the committed-action probe
 * is the union of three entries, and a status change moves the row between them — the
 * mutation invalidates all three, they refetch concurrently, and when the old entry's
 * response lands before the new entry's the row is in none of them. Before this, that
 * instant re-armed `isLoading` and replaced the whole detail — header, status card,
 * step list, footer input — with the loading scaffold, on the screen's primary action.
 * The single-row read still fires on the miss (it is what serves an action that lands
 * off page one of its new archive); what changed is that the loading scaffold is only
 * for a screen that has nothing to show. A single-row read that answers "not found"
 * still wins over the held row.
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

  // Adjusted during render, React's own pattern for state derived from what just
  // arrived: no effect (which would paint the miss for one frame before correcting it)
  // and no ref (which the render is not allowed to read).
  const [lastHit, setLastHit] = useState<T | null>(null);
  if (fromCache && fromCache !== lastHit) setLastHit(fromCache);
  // Keyed on the id, so a screen re-pointed at another row does not paint the old one.
  const held = lastHit?.id === itemId ? lastHit : null;

  // `fetched` is `undefined` until the single-row read answers and `null` when it
  // answers "not found" — only the former defers to the held row.
  const item = fromCache ?? (fetched === undefined ? held : fetched);
  return {
    item,
    isLoading: !item && isLoading,
  };
}
