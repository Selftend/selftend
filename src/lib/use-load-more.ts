import { useCallback } from "react";

/** The slice of a `useInfiniteQuery` result that decides whether the next page may be asked for. */
export interface LoadMoreSource {
  fetchNextPage: () => Promise<unknown>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
}

/**
 * The one `onEndReached` handler every keyset-paged list uses — the guard lives here so it
 * cannot drift between the nineteen screens that need it (#2255).
 *
 * `hasNextPage` alone is not enough: `onEndReached` fires repeatedly while the fetch is in
 * flight, and each call would start another page from the same cursor — hence
 * `!isFetchingNextPage`.
 *
 * ☠️ And `!isFetchingNextPage` alone is not enough either. VirtualizedList re-fires
 * `onEndReached` on every content-size change while the viewport sits inside the
 * threshold, and the list's footer changes height as it swaps a spinner for an error line
 * and back. `hasNextPage` is derived from the last GOOD page's cursor, so it survives a
 * failed `fetchNextPage`; without `!isFetchNextPageError` a page that keeps failing loops
 * on its own — fetch, fail, footer grows, `onEndReached`, fetch — two requests a second
 * with the Retry button rendered for about one frame per cycle. A failed page waits for
 * the user's Retry (`LoadMoreFooter`), which calls `fetchNextPage` directly and clears the
 * flag when it lands.
 *
 * ☠️ That last sentence is a PRECONDITION, not a description. TanStack keeps
 * `isFetchNextPageError` set until a fetch succeeds or a plain `refetch` clears
 * `fetchMeta`, and `onEndReached` is a list screen's only forward-fetch trigger — so on a
 * screen with no `LoadMoreFooter`, this guard turns one transient page failure into a
 * permanent, silent cap on the archive, wearing the face of its end. Adopting this hook
 * without rendering that footer is therefore a defect, and `test/load-more-guard.test.ts`
 * fails on it.
 */
export function useLoadMore({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
}: LoadMoreSource) {
  return useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError]);
}
