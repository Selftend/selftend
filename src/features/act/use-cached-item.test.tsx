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

/**
 * A row this hook has painted stays painted across a cache MISS (#2257). The
 * committed-action probe is a union of three entries and a status change moves the row
 * between them; while the three refetch, the row is momentarily in none — and that
 * instant used to re-arm `isLoading` and replace the whole detail with its loading
 * scaffold. The single-row read still fires on the miss; only the scaffold is gone.
 */
describe("useCachedItem across a cache miss", () => {
  it("keeps the painted row while the cache momentarily loses it, and still reads it", () => {
    const useItem = jest.fn((userId: string | null, itemId: string | null) => ({
      data: undefined,
      isLoading: Boolean(userId && itemId),
    }));
    const { result, rerender } = renderHook(
      (props: { list: Row[] }) =>
        useCachedItem(() => ({ data: props.list }), useItem, "user-1", "row-1"),
      { initialProps: { list: [ROW] } },
    );
    expect(result.current.item).toEqual(ROW);

    rerender({ list: [] });

    expect(result.current.item).toEqual(ROW);
    expect(result.current.isLoading).toBe(false);
    expect(useItem).toHaveBeenLastCalledWith("user-1", "row-1");
  });

  it("lets the single-row read's answer replace the held row, not-found included", () => {
    const { result, rerender } = renderHook(
      (props: { list: Row[]; answer: Row | null }) =>
        useCachedItem(
          () => ({ data: props.list }),
          (userId, itemId) => ({
            data: userId && itemId ? props.answer : undefined,
            isLoading: false,
          }),
          "user-1",
          "row-1",
        ),
      { initialProps: { list: [ROW], answer: null } },
    );
    expect(result.current.item).toEqual(ROW);

    const reRead: Row = { id: "row-1", name: "re-read" };
    rerender({ list: [], answer: reRead });
    expect(result.current.item).toEqual(reRead);

    rerender({ list: [], answer: null });
    expect(result.current.item).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("does not paint the held row for a different id", () => {
    const useItem = jest.fn(() => ({ data: undefined, isLoading: true }));
    const { result, rerender } = renderHook(
      (props: { list: Row[]; itemId: string }) =>
        useCachedItem(() => ({ data: props.list }), useItem, "user-1", props.itemId),
      { initialProps: { list: [ROW], itemId: "row-1" } },
    );
    expect(result.current.item).toEqual(ROW);

    rerender({ list: [], itemId: "row-2" });

    expect(result.current.item).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });
});
