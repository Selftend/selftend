import { act, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

import { favoriteKeys, useToggleFavorite } from "@/src/features/favorites/queries";
import { addFavorite, listFavorites, removeFavorite } from "@/src/features/favorites/repository";
import { useToastStore } from "@/src/stores/toast-store";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/favorites/repository", () => ({
  listFavorites: jest.fn(),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
}));

const mockList = listFavorites as jest.MockedFunction<typeof listFavorites>;
const mockAdd = addFavorite as jest.MockedFunction<typeof addFavorite>;
const mockRemove = removeFavorite as jest.MockedFunction<typeof removeFavorite>;

const USER = "user-1";
const LIST_KEY = favoriteKeys.list(USER);
const MOOD = { kind: "tool" as const, key: "mood" };

function setup() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(LIST_KEY, []);
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useToggleFavorite(USER, "tool", "mood"), { wrapper });
  return { queryClient, ...hook };
}

beforeEach(() => {
  jest.clearAllMocks();
  useToastStore.getState().clearToasts();
  mockList.mockResolvedValue([]);
  mockAdd.mockResolvedValue(undefined);
  mockRemove.mockResolvedValue(undefined);
});

describe("useToggleFavorite (#1888 / #1955)", () => {
  /**
   * The race, closed by `scope` rather than SQL (#1889). Three presses with the FIRST
   * request held: the optimistic cache reflects the LAST press at once, but only one
   * request is in flight, and the rest wait their turn in press order. Delete `scope`
   * from the hook and `removeFavorite` is called while the first add is still held —
   * which is this test going red, and the mutation test the ticket asks for.
   */
  it("lands a star→unstar→star burst in press order, one request at a time", async () => {
    let releaseFirst: () => void = () => {};
    mockAdd.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseFirst = resolve;
        }),
    );
    // The server's state once the burst has landed, for the settle-time refetch.
    mockList.mockResolvedValue([MOOD]);

    const { queryClient, result } = setup();

    // `onMutate` awaits `cancelQueries` before it writes, so the flip lands one
    // microtask after the press; the async `act` flushes it.
    await act(async () => {
      result.current.mutate(true);
      result.current.mutate(false);
      result.current.mutate(true);
    });

    // Optimistic: the cache already shows the last press.
    expect(queryClient.getQueryData(LIST_KEY)).toEqual([MOOD]);
    // Serialised: the first add is held, so nothing else has started.
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockRemove).not.toHaveBeenCalled();

    await act(async () => {
      releaseFirst();
    });

    await waitFor(() => expect(mockRemove).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(queryClient.isMutating()).toBe(0));

    expect(queryClient.getQueryData(LIST_KEY)).toEqual([MOOD]);
  });

  /**
   * The rollback lives in the hook's own `onError`, and this is the test that tells the
   * two placements apart: pressing the card navigates, so the caller unmounts, and a
   * `mutate(vars, { onError })` callback is dropped with it — leaving the optimistic
   * lie in cache and no toast. A hook-level callback is stored on the mutation and
   * survives.
   */
  it("rolls back the optimistic flip and toasts title-only after the caller unmounts", async () => {
    // The failure arrives AFTER the caller is gone - the order that separates the two
    // placements. An immediate rejection would roll back inside the press's own flush.
    let failFirst: (error: Error) => void = () => {};
    mockAdd.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          failFirst = reject;
        }),
    );

    const { queryClient, result, unmount } = setup();

    await act(async () => {
      result.current.mutate(true);
    });
    expect(queryClient.getQueryData(LIST_KEY)).toEqual([MOOD]);

    unmount();

    await act(async () => {
      failFirst(new Error("boom"));
    });

    await waitFor(() => expect(queryClient.getQueryData(LIST_KEY)).toEqual([]));

    const toast = useToastStore.getState().visible;
    expect(toast).toMatchObject({ title: "Couldn't save", tone: "error" });
    // Title-only: the global toast's "Your changes are still on this screen" would be
    // false once the star has rolled back.
    expect(toast?.description).toBeUndefined();
    expect(useToastStore.getState().queue).toEqual([]);
  });

  it("fires no toast on success", async () => {
    const { queryClient, result } = setup();

    await act(async () => {
      result.current.mutate(true);
    });
    await waitFor(() => expect(queryClient.isMutating()).toBe(0));

    expect(useToastStore.getState().visible).toBeNull();
    expect(mockAdd).toHaveBeenCalledWith(USER, "tool", "mood");
  });
});
