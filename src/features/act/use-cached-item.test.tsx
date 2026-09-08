import { renderHook } from "@testing-library/react-native";

import { useCachedItem } from "@/src/features/act/use-cached-item";

type Row = { id: string; name: string };

const ROW: Row = { id: "row-1", name: "held" };

function itemHook(fetched: Row | null) {
  return jest.fn((userId: string | null, itemId: string | null) => ({
    data: userId && itemId ? fetched : null,
    isLoading: false,
  }));
}

/**
 * `useCachedItem` reads whatever shape the list screen cached (#2190): a bare array from
 * a plain list query, or the `{ pages }` envelope of an infinite archive. The six ACT
 * archives are infinite queries, so the envelope is the shape that matters now — the
 * array branch is what the pre-#1517 screens filled.
 */
describe("useCachedItem", () => {
  it("finds the row inside an infinite query's pages and leaves the single-row read off", () => {
    const useItem = itemHook(null);
    const { result } = renderHook(() =>
      useCachedItem(
        () => ({ data: { pages: [[{ id: "other", name: "no" }], [ROW]] } }),
        useItem,
        "user-1",
        "row-1",
      ),
    );

    expect(result.current.item).toEqual(ROW);
    expect(result.current.isLoading).toBe(false);
    expect(useItem).toHaveBeenCalledWith(null, null);
  });

  it("still reads a bare cached array", () => {
    const useItem = itemHook(null);
    const { result } = renderHook(() =>
      useCachedItem(() => ({ data: [ROW] }), useItem, "user-1", "row-1"),
    );

    expect(result.current.item).toEqual(ROW);
    expect(useItem).toHaveBeenCalledWith(null, null);
  });

  it("fetches the row on its own when no list is cached", () => {
    const useItem = itemHook(ROW);
    const { result } = renderHook(() =>
      useCachedItem(() => ({ data: undefined }), useItem, "user-1", "row-1"),
    );

    expect(result.current.item).toEqual(ROW);
    expect(useItem).toHaveBeenCalledWith("user-1", "row-1");
  });

  it("fetches the row on its own when the cached pages do not hold it", () => {
    const useItem = itemHook(ROW);
    const { result } = renderHook(() =>
      useCachedItem(
        () => ({ data: { pages: [[{ id: "other", name: "no" }]] } }),
        useItem,
        "user-1",
        "row-1",
      ),
    );

    expect(result.current.item).toEqual(ROW);
    expect(useItem).toHaveBeenCalledWith("user-1", "row-1");
  });
});
