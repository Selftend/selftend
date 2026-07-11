import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import * as repo from "@/src/features/journal/repository";
import {
  useDeleteJournalEntry,
  useJournalEntries,
  useJournalEntry,
  useJournalEntryCount,
  useJournalEntryCountSince,
  useSaveJournalEntry,
} from "@/src/features/journal/queries";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern already
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/journal/repository", () => ({
  countJournalEntries: jest.fn(),
  countJournalEntriesSince: jest.fn(),
  deleteJournalEntry: jest.fn(),
  getJournalEntry: jest.fn(),
  listJournalEntries: jest.fn(),
  saveJournalEntry: jest.fn(),
}));

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Every repo fn resolves to a benign value so queryFn/mutationFn don't throw.
  for (const fn of Object.values(repo)) {
    if (typeof fn === "function") (fn as jest.Mock).mockResolvedValue([]);
  }
});

// ---------------------------------------------------------------------------
// List / count hooks: enabled = Boolean(userId) -> queryFn never runs for null.
// ---------------------------------------------------------------------------
const singleIdHooks = [
  ["useJournalEntries", useJournalEntries, repo.listJournalEntries],
  ["useJournalEntryCount", useJournalEntryCount, repo.countJournalEntries],
] as const;

describe.each(singleIdHooks)("%s enabled gate", (_name, useHook, repoFn) => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null) => unknown)(null), {
      wrapper: wrap(client),
    });
    expect(repoFn).not.toHaveBeenCalled();
  });

  it("fetches when userId is present", async () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null) => unknown)("u1"), {
      wrapper: wrap(client),
    });
    await waitFor(() => expect(repoFn).toHaveBeenCalled());
  });
});

describe("useJournalEntryCountSince enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useJournalEntryCountSince(null, "2026-01-01T00:00:00.000Z"), {
      wrapper: wrap(client),
    });
    expect(repo.countJournalEntriesSince).not.toHaveBeenCalled();
  });

  it("fetches with the userId and sinceIso when userId is present", async () => {
    (repo.countJournalEntriesSince as jest.Mock).mockResolvedValue(3);
    const client = createTestQueryClient();
    renderHook(() => useJournalEntryCountSince("u1", "2026-01-01T00:00:00.000Z"), {
      wrapper: wrap(client),
    });
    await waitFor(() =>
      expect(repo.countJournalEntriesSince).toHaveBeenCalledWith("u1", "2026-01-01T00:00:00.000Z"),
    );
  });
});

// ---------------------------------------------------------------------------
// Detail hook: enabled = Boolean(userId && id). Cover all three && states:
// userId missing, id missing, both present.
// ---------------------------------------------------------------------------
describe("useJournalEntry enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useJournalEntry(null, "e1"), { wrapper: wrap(client) });
    expect(repo.getJournalEntry).not.toHaveBeenCalled();
  });

  it("does not fetch when the entry id is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useJournalEntry("u1", null), { wrapper: wrap(client) });
    expect(repo.getJournalEntry).not.toHaveBeenCalled();
  });

  it("fetches when both userId and id are present", async () => {
    (repo.getJournalEntry as jest.Mock).mockResolvedValue(null);
    const client = createTestQueryClient();
    renderHook(() => useJournalEntry("u1", "e1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.getJournalEntry).toHaveBeenCalledWith("u1", "e1"));
  });
});

// ---------------------------------------------------------------------------
// useSaveJournalEntry: onSuccess guard `if (!userId) return;`. Cover both the
// real-user path (mutationFn + invalidateQueries with the exact journal key) and
// the null-user path (guard short-circuits, no invalidate).
// ---------------------------------------------------------------------------
describe("useSaveJournalEntry onSuccess guard", () => {
  it("saves and invalidates the journal root key for a real user", async () => {
    (repo.saveJournalEntry as jest.Mock).mockResolvedValue({ id: "e1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveJournalEntry("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: { title: "t", body: "b" } });

    expect(repo.saveJournalEntry).toHaveBeenCalledWith("u1", { title: "t", body: "b" }, undefined);
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["journal"]);
  });

  it("forwards the entryId to the repository for an update", async () => {
    (repo.saveJournalEntry as jest.Mock).mockResolvedValue({ id: "e1" });
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveJournalEntry("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: { title: "t", body: "b" }, entryId: "e1" });

    expect(repo.saveJournalEntry).toHaveBeenCalledWith("u1", { title: "t", body: "b" }, "e1");
  });

  it("skips invalidation when userId is null", async () => {
    (repo.saveJournalEntry as jest.Mock).mockResolvedValue({ id: "e1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveJournalEntry(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: { title: "t", body: "b" } });

    expect(repo.saveJournalEntry).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useDeleteJournalEntry: delegates to useDeleteMutation. Exercise the real-user
// path (deleteFn called with (userId, id) + invalidate the journal root key).
// ---------------------------------------------------------------------------
describe("useDeleteJournalEntry", () => {
  it("deletes with (userId, id) and invalidates the journal root key", async () => {
    (repo.deleteJournalEntry as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteJournalEntry("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync("e1");

    expect(repo.deleteJournalEntry).toHaveBeenCalledWith("u1", "e1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["journal"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.deleteJournalEntry as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteJournalEntry(null), { wrapper: wrap(client) });

    await result.current.mutateAsync("e1");

    expect(spy).not.toHaveBeenCalled();
  });
});
