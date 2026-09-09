import { renderHook } from "@testing-library/react-native";

import { useLoadMore, type LoadMoreSource } from "@/src/lib/use-load-more";

function source(over: Partial<LoadMoreSource> = {}): LoadMoreSource {
  return {
    fetchNextPage: jest.fn(async () => undefined),
    hasNextPage: true,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    ...over,
  };
}

describe("useLoadMore", () => {
  it("asks for the next page when there is one and nothing is in flight", () => {
    const src = source();
    const { result } = renderHook(() => useLoadMore(src));

    result.current();

    expect(src.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("stops asking once the last page has arrived", () => {
    const src = source({ hasNextPage: false });
    const { result } = renderHook(() => useLoadMore(src));

    result.current();

    expect(src.fetchNextPage).not.toHaveBeenCalled();
  });

  it("does not queue another page while one is loading", () => {
    const src = source({ isFetchingNextPage: true });
    const { result } = renderHook(() => useLoadMore(src));

    result.current();

    expect(src.fetchNextPage).not.toHaveBeenCalled();
  });

  /**
   * ☠️ A failed page must wait for the user (#2255). `hasNextPage` survives a failed
   * `fetchNextPage`, and the footer's spinner-to-error height swap re-fires
   * `onEndReached`, so without this gate a persistently failing page retries itself in a
   * loop and the Retry button is never on screen long enough to press.
   */
  it("does not retry a failed page on its own", () => {
    const src = source({ isFetchNextPageError: true });
    const { result } = renderHook(() => useLoadMore(src));

    result.current();

    expect(src.fetchNextPage).not.toHaveBeenCalled();
  });
});
