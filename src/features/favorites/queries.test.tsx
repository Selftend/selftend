import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  favoriteKeys,
  isFavorite,
  useFavorites,
  useSetFavorite,
} from "@/src/features/favorites/queries";
import { addFavorite, listFavorites, removeFavorite } from "@/src/features/favorites/repository";
import { createAppQueryClient } from "@/src/lib/query-client";
import { useToastStore } from "@/src/stores/toast-store";

jest.mock("@/src/features/favorites/repository", () => ({
  addFavorite: jest.fn(),
  listFavorites: jest.fn(),
  removeFavorite: jest.fn(),
}));

// `createAppQueryClient` reports mutation errors to Sentry before deciding on the toast;
// the reporter is not under test here and must not reach the network.
jest.mock("@/src/lib/sentry", () => ({
  captureError: jest.fn(),
  isReportableError: () => false,
}));

const mockList = jest.mocked(listFavorites);
const mockAdd = jest.mocked(addFavorite);
const mockRemove = jest.mocked(removeFavorite);

const USER = "u1";
const listKey = favoriteKeys.list(USER);

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** A promise the test resolves or rejects by hand, so a request can be HELD. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * The REAL app client, not the bare test one: its `MutationCache.onError` is the global
 * save-failed toast, and the suppression + title-only replacement below are only proven
 * against the thing they replace. Its default `retry: 1` on queries is irrelevant here
 * (the list never fails), and mutations do not retry.
 *
 * Cleared after each test: the app client's 24h `gcTime` is a live timer that would
 * otherwise keep the jest worker open after the suite finishes.
 */
const clients: QueryClient[] = [];
function appClient() {
  const client = createAppQueryClient();
  clients.push(client);
  return client;
}
afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

/** Loads the list into `client` and returns it, so a star has something to flip. */
async function primeList(client: QueryClient, rows: { kind: "tool" | "module"; key: string }[]) {
  mockList.mockResolvedValue(rows);
  const { result, unmount } = renderHook(() => useFavorites(USER), {
    wrapper: makeWrapper(client),
  });
  await waitFor(() => expect(result.current.data).toEqual(rows));
  unmount();
}

beforeEach(() => {
  jest.clearAllMocks();
  useToastStore.getState().clearToasts();
});

describe("useFavorites", () => {
  it("lists the caller's favourites", async () => {
    const client = appClient();
    mockList.mockResolvedValue([{ kind: "tool", key: "mood" }]);

    const { result } = renderHook(() => useFavorites(USER), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ kind: "tool", key: "mood" }]);
    expect(mockList).toHaveBeenCalledWith(USER);
  });

  it("does not fetch without a user", () => {
    const client = appClient();
    const { result } = renderHook(() => useFavorites(null), { wrapper: makeWrapper(client) });

    expect(result.current.data).toBeUndefined();
    expect(mockList).not.toHaveBeenCalled();
  });
});

describe("isFavorite", () => {
  it("is undefined until the list has loaded - a star must not be drawn hollow on a guess", () => {
    expect(isFavorite(undefined, "tool", "mood")).toBeUndefined();
  });

  it("matches on the (kind, key) pair, never on the key alone", () => {
    const rows = [{ kind: "module" as const, key: "cbt" }];
    expect(isFavorite(rows, "module", "cbt")).toBe(true);
    expect(isFavorite(rows, "tool", "cbt")).toBe(false);
    expect(isFavorite(rows, "module", "act")).toBe(false);
  });
});

describe("useSetFavorite", () => {
  it("flips the cached list before the request lands, and never toasts on success", async () => {
    const client = appClient();
    await primeList(client, []);
    const held = deferred();
    mockAdd.mockReturnValue(held.promise);

    const { result } = renderHook(() => useSetFavorite(USER, "tool", "mood"), {
      wrapper: makeWrapper(client),
    });
    act(() => result.current.mutate(true));

    // Optimistic: the cache says "starred" while the add is still in flight.
    await waitFor(() =>
      expect(client.getQueryData(listKey)).toEqual([{ kind: "tool", key: "mood" }]),
    );
    expect(mockAdd).toHaveBeenCalledWith(USER, "tool", "mood");

    held.resolve();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useToastStore.getState().visible).toBeNull();
  });

  it("removes by the same hook when told false", async () => {
    const client = appClient();
    await primeList(client, [{ kind: "module", key: "cbt" }]);
    mockRemove.mockResolvedValue();

    const { result } = renderHook(() => useSetFavorite(USER, "module", "cbt"), {
      wrapper: makeWrapper(client),
    });
    act(() => result.current.mutate(false));

    await waitFor(() => expect(client.getQueryData(listKey)).toEqual([]));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRemove).toHaveBeenCalledWith(USER, "module", "cbt");
  });

  /**
   * ☠️ Mutation-tested: delete `scope` from the hook and this goes red (spec §2.4, #974's
   * lesson). Without a scope the unstar fires while the first star is still in flight,
   * and whichever request the server applies last wins - which is not the last press.
   *
   * The server here applies a write when the request RESOLVES, so the held first request
   * is exactly the reorder a slow network produces.
   */
  it("serialises star → unstar → star in press order while the first request is held", async () => {
    const client = appClient();
    await primeList(client, []);

    const server = new Set<string>();
    const firstAdd = deferred();
    let addCalls = 0;
    mockAdd.mockImplementation(async () => {
      addCalls += 1;
      if (addCalls === 1) await firstAdd.promise;
      server.add("tool:mood");
    });
    mockRemove.mockImplementation(async () => {
      server.delete("tool:mood");
    });

    const { result } = renderHook(() => useSetFavorite(USER, "tool", "mood"), {
      wrapper: makeWrapper(client),
    });

    act(() => result.current.mutate(true));
    act(() => result.current.mutate(false));
    act(() => result.current.mutate(true));

    // Every optimistic flip has already applied, in order, so the cache reads "starred" -
    // `onMutate` runs before the retryer is awaited, even on a paused mutation.
    await waitFor(() =>
      expect(client.getQueryData(listKey)).toEqual([{ kind: "tool", key: "mood" }]),
    );
    // The unstar has NOT been sent: it waits behind the held star.
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockRemove).not.toHaveBeenCalled();

    firstAdd.resolve();

    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(client.isMutating()).toBe(0));
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(server.has("tool:mood")).toBe(true);
    expect(client.getQueryData(listKey)).toEqual([{ kind: "tool", key: "mood" }]);
  });

  /**
   * ☠️ The rollback and the toast live in the mutation's own `onError`, never in
   * `mutate(id, { onError })`: pressing the card navigates, the caller unmounts, and a
   * call-site callback is dropped (`MutationObserver.#notify` gates it on
   * `hasListeners()`), leaving the optimistic lie in cache. This test unmounts BEFORE the
   * rejection arrives, so a mutate-level `onError` cannot pass it.
   */
  it("rolls the optimistic flip back and toasts title-only, even after the caller has unmounted", async () => {
    const client = appClient();
    await primeList(client, []);
    const failing = deferred();
    mockAdd.mockReturnValue(failing.promise);

    const { result, unmount } = renderHook(() => useSetFavorite(USER, "tool", "mood"), {
      wrapper: makeWrapper(client),
    });
    act(() => result.current.mutate(true));
    await waitFor(() =>
      expect(client.getQueryData(listKey)).toEqual([{ kind: "tool", key: "mood" }]),
    );

    // The card is gone before the server answers.
    unmount();
    failing.reject(new Error("network down"));

    await waitFor(() => expect(client.getQueryData(listKey)).toEqual([]));
    await waitFor(() => expect(client.isMutating()).toBe(0));

    // One toast, the global one suppressed: its description ("Your changes are still on
    // this screen") is false once the star has rolled back.
    const { visible, queue } = useToastStore.getState();
    expect(visible).toEqual({ id: expect.any(Number), title: "Couldn't save", tone: "error" });
    expect(visible).not.toHaveProperty("description");
    expect(queue).toEqual([]);
  });

  it("names its scope after the row, so two cards for one item share the queue", async () => {
    const client = appClient();
    await primeList(client, []);
    mockAdd.mockResolvedValue();

    const { result } = renderHook(() => useSetFavorite(USER, "module", "act"), {
      wrapper: makeWrapper(client),
    });
    act(() => result.current.mutate(true));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [mutation] = client.getMutationCache().findAll();
    expect(mutation?.options.scope).toEqual({ id: "favorite:module:act" });
    // Fails fast offline rather than queueing a press the user can no longer see.
    expect(mutation?.options.networkMode).toBe("always");
  });
});
