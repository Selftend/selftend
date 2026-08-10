import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useDeleteGratitudeEntry,
  useFavoriteGratitudeEntryCount,
  useFavoriteGratitudeEntries,
  useGratitudeEntries,
  useGratitudeEntryPages,
  useGratitudeEntry,
  useGratitudeEntryCount,
  useGratitudeEntryCountSinceDayKey,
  useSaveGratitudeEntry,
  useSetGratitudeEntryStarred,
} from "@/src/features/gratitude/queries";
import * as repo from "@/src/features/gratitude/repository";
import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern already
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/gratitude/repository", () => ({
  countGratitudeEntries: jest.fn(),
  countFavoriteGratitudeEntries: jest.fn(),
  countGratitudeEntriesSinceDayKey: jest.fn(),
  deleteGratitudeEntry: jest.fn(),
  getGratitudeEntry: jest.fn(),
  listFavoriteGratitudeEntries: jest.fn(),
  listGratitudeEntries: jest.fn(),
  listGratitudeEntriesPage: jest.fn(),
  saveGratitudeEntry: jest.fn(),
  setGratitudeEntryStarred: jest.fn(),
}));

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function makeEntry(overrides: Partial<GratitudeEntry> = {}): GratitudeEntry {
  return {
    id: "g1",
    userId: "u1",
    level: 3,
    items: ["a", "b", "c"],
    note: "",
    loggedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    events: [],
    goodMoment: "",
    missIfGone: "",
    hiddenGood: "",
    lifeItems: ["", "", ""],
    starred: false,
    ...overrides,
  } as GratitudeEntry;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Every repo fn resolves to a benign value so queryFn/mutationFn don't throw.
  for (const fn of Object.values(repo)) {
    if (typeof fn === "function") (fn as jest.Mock).mockResolvedValue([]);
  }
});

// ---------------------------------------------------------------------------
// Single-arg `enabled: Boolean(userId)` list/count query gate. Both branches:
// null user -> queryFn never runs; real user -> queryFn runs (asserted via
// the repo call args, not just "was called").
// ---------------------------------------------------------------------------
const singleArgHooks = [
  ["useGratitudeEntries", useGratitudeEntries, repo.listGratitudeEntries],
  ["useGratitudeEntryCount", useGratitudeEntryCount, repo.countGratitudeEntries],
  [
    "useFavoriteGratitudeEntryCount",
    useFavoriteGratitudeEntryCount,
    repo.countFavoriteGratitudeEntries,
  ],
  ["useFavoriteGratitudeEntries", useFavoriteGratitudeEntries, repo.listFavoriteGratitudeEntries],
] as const;

describe.each(singleArgHooks)("%s enabled gate", (_name, useHook, repoFn) => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null) => unknown)(null), { wrapper: wrap(client) });
    expect(repoFn).not.toHaveBeenCalled();
  });

  it("fetches for a real user", async () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null) => unknown)("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repoFn).toHaveBeenCalled());
    expect((repoFn as jest.Mock).mock.calls[0][0]).toBe("u1");
  });
});

describe("useGratitudeEntryPages enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useGratitudeEntryPages(null), { wrapper: wrap(client) });
    expect(repo.listGratitudeEntriesPage).not.toHaveBeenCalled();
  });

  it("loads the first page for a real user", async () => {
    (repo.listGratitudeEntriesPage as jest.Mock).mockResolvedValue([]);
    const client = createTestQueryClient();
    renderHook(() => useGratitudeEntryPages("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.listGratitudeEntriesPage).toHaveBeenCalled());
    expect(repo.listGratitudeEntriesPage).toHaveBeenCalledWith("u1", 20, null);
  });
});

// useGratitudeEntryCountSinceDayKey has a second (non-gating) arg threaded into the
// query key and the repo call.
describe("useGratitudeEntryCountSinceDayKey enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useGratitudeEntryCountSinceDayKey(null, "2026-01-01"), {
      wrapper: wrap(client),
    });
    expect(repo.countGratitudeEntriesSinceDayKey).not.toHaveBeenCalled();
  });

  it("fetches with the userId and sinceIso for a real user", async () => {
    const client = createTestQueryClient();
    renderHook(() => useGratitudeEntryCountSinceDayKey("u1", "2026-01-01"), {
      wrapper: wrap(client),
    });
    await waitFor(() => expect(repo.countGratitudeEntriesSinceDayKey).toHaveBeenCalled());
    expect(repo.countGratitudeEntriesSinceDayKey).toHaveBeenCalledWith("u1", "2026-01-01");
  });
});

// ---------------------------------------------------------------------------
// useGratitudeEntry two-id detail gate: enabled = Boolean(userId && id).
// All three `&&` states.
// ---------------------------------------------------------------------------
describe("useGratitudeEntry detail gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useGratitudeEntry(null, "g1"), { wrapper: wrap(client) });
    expect(repo.getGratitudeEntry).not.toHaveBeenCalled();
  });

  it("does not fetch when id is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useGratitudeEntry("u1", null), { wrapper: wrap(client) });
    expect(repo.getGratitudeEntry).not.toHaveBeenCalled();
  });

  it("fetches when both userId and id are present", async () => {
    (repo.getGratitudeEntry as jest.Mock).mockResolvedValue(makeEntry());
    const client = createTestQueryClient();
    renderHook(() => useGratitudeEntry("u1", "g1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.getGratitudeEntry).toHaveBeenCalled());
    expect(repo.getGratitudeEntry).toHaveBeenCalledWith("u1", "g1");
  });
});

// ---------------------------------------------------------------------------
// useSaveGratitudeEntry: onSuccess guard `if (!userId) return;`. Both branches.
// Real user invalidates the whole ["gratitude"] prefix (gratitudeKeys.all).
// ---------------------------------------------------------------------------
describe("useSaveGratitudeEntry onSuccess guard", () => {
  it("saves and invalidates the gratitude prefix for a real user", async () => {
    (repo.saveGratitudeEntry as jest.Mock).mockResolvedValue(makeEntry());
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveGratitudeEntry("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: { items: ["x"] } } as never);

    expect(repo.saveGratitudeEntry).toHaveBeenCalled();
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["gratitude"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.saveGratitudeEntry as jest.Mock).mockResolvedValue(makeEntry());
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveGratitudeEntry(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: { items: ["x"] } } as never);

    expect(repo.saveGratitudeEntry).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useDeleteGratitudeEntry: delegates to useDeleteMutation. Real user path
// drives deleteFn(userId, id) and the ["gratitude"] invalidation.
// ---------------------------------------------------------------------------
describe("useDeleteGratitudeEntry", () => {
  it("deletes with (userId, id) and invalidates the gratitude prefix", async () => {
    (repo.deleteGratitudeEntry as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteGratitudeEntry("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync("g1");

    expect(repo.deleteGratitudeEntry).toHaveBeenCalledWith("u1", "g1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["gratitude"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.deleteGratitudeEntry as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteGratitudeEntry(null), { wrapper: wrap(client) });

    await result.current.mutateAsync("g1");

    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useSetGratitudeEntryStarred: onSuccess guard, then a targeted cache update
// instead of a full-prefix invalidation:
//   - setQueriesData over ["gratitude","list",userId] patches the changed row
//   - setQueryData writes the detail entry
//   - only ["gratitude","favorites",userId] is invalidated (NOT ["gratitude"])
// ---------------------------------------------------------------------------
describe("useSetGratitudeEntryStarred onSuccess", () => {
  it("patches cached lists + detail and invalidates dependent collections", async () => {
    const updated = makeEntry({ id: "g1", starred: true, note: "patched" });
    (repo.setGratitudeEntryStarred as jest.Mock).mockResolvedValue(updated);

    const client = createTestQueryClient();
    // Seed a cached list containing the stale (un-starred) row.
    const stale = makeEntry({ id: "g1", starred: false, note: "stale" });
    const other = makeEntry({ id: "g2" });
    client.setQueryData(["gratitude", "list", "u1", 50], [stale, other]);

    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSetGratitudeEntryStarred("u1"), {
      wrapper: wrap(client),
    });

    await result.current.mutateAsync({ id: "g1", starred: true });

    expect(repo.setGratitudeEntryStarred).toHaveBeenCalledWith("u1", "g1", true);

    // setQueriesData replaced the matching row in the cached list, left others.
    // (React Query's structural sharing re-clones, so compare by value.)
    const patchedList = client.getQueryData<GratitudeEntry[]>(["gratitude", "list", "u1", 50]);
    expect(patchedList?.[0]).toStrictEqual(updated);
    expect(patchedList?.[0].starred).toBe(true);
    expect(patchedList?.[0].note).toBe("patched");
    expect(patchedList?.[1]).toStrictEqual(other);

    // setQueryData wrote the detail entry.
    expect(client.getQueryData(["gratitude", "detail", "u1", "g1"])).toStrictEqual(updated);

    // Only favorites is invalidated - not the whole ["gratitude"] prefix.
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["gratitude", "favorites", "u1"]);
    expect(queryKeys).toContainEqual(["gratitude", "history-pages", "u1"]);
    expect(queryKeys).toContainEqual(["gratitude", "favorite-count", "u1"]);
    expect(queryKeys).not.toContainEqual(["gratitude"]);
  });

  it("skips all cache work when userId is null", async () => {
    const updated = makeEntry({ id: "g1", starred: true });
    (repo.setGratitudeEntryStarred as jest.Mock).mockResolvedValue(updated);

    const client = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const setQueriesSpy = jest.spyOn(client, "setQueriesData");
    const setQuerySpy = jest.spyOn(client, "setQueryData");
    const { result } = renderHook(() => useSetGratitudeEntryStarred(null), {
      wrapper: wrap(client),
    });

    await result.current.mutateAsync({ id: "g1", starred: true });

    expect(repo.setGratitudeEntryStarred).toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(setQueriesSpy).not.toHaveBeenCalled();
    expect(setQuerySpy).not.toHaveBeenCalled();
  });
});
