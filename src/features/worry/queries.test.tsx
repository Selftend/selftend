import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import * as repo from "@/src/features/worry/repository";
import {
  useDeleteWorryEntry,
  useSaveWorryEntry,
  useToggleWorryResolved,
  useWorryEntries,
  useWorryEntry,
} from "@/src/features/worry/queries";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern already
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/worry/repository", () => ({
  deleteWorryEntry: jest.fn(),
  getWorryEntry: jest.fn(),
  listWorryEntries: jest.fn(),
  saveWorryEntry: jest.fn(),
  toggleWorryResolved: jest.fn(),
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
    if (typeof fn === "function") (fn as jest.Mock).mockResolvedValue(undefined);
  }
});

// ---------------------------------------------------------------------------
// useWorryEntries: enabled = Boolean(userId). queryFn never runs for null user.
// ---------------------------------------------------------------------------
describe("useWorryEntries enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useWorryEntries(null), { wrapper: wrap(client) });
    expect(repo.listWorryEntries).not.toHaveBeenCalled();
  });

  it("fetches with the real user id when userId is present", async () => {
    (repo.listWorryEntries as jest.Mock).mockResolvedValue([]);
    const client = createTestQueryClient();
    renderHook(() => useWorryEntries("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.listWorryEntries).toHaveBeenCalledWith("u1"));
  });
});

// ---------------------------------------------------------------------------
// useWorryEntry: enabled = Boolean(userId && entryId). Cover all three states
// of the two-id gate: userId missing, entryId missing, both present.
// ---------------------------------------------------------------------------
describe("useWorryEntry enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useWorryEntry(null, "e1"), { wrapper: wrap(client) });
    expect(repo.getWorryEntry).not.toHaveBeenCalled();
  });

  it("does not fetch when entryId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useWorryEntry("u1", null), { wrapper: wrap(client) });
    expect(repo.getWorryEntry).not.toHaveBeenCalled();
  });

  it("fetches with both ids when userId and entryId are present", async () => {
    (repo.getWorryEntry as jest.Mock).mockResolvedValue(null);
    const client = createTestQueryClient();
    renderHook(() => useWorryEntry("u1", "e1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.getWorryEntry).toHaveBeenCalledWith("u1", "e1"));
  });
});

// ---------------------------------------------------------------------------
// useSaveWorryEntry: onSuccess guard `if (!userId) return;` plus a Promise.all
// that invalidates the list key and the detail key derived from entry.id.
// ---------------------------------------------------------------------------
describe("useSaveWorryEntry onSuccess guard", () => {
  it("invalidates the list and the entry detail key for a real user", async () => {
    (repo.saveWorryEntry as jest.Mock).mockResolvedValue({ id: "e1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveWorryEntry("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: {}, entryId: "e1" } as never);

    expect(repo.saveWorryEntry).toHaveBeenCalledWith("u1", {}, "e1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["worry", "list", "u1"]);
    expect(queryKeys).toContainEqual(["worry", "detail", "u1", "e1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.saveWorryEntry as jest.Mock).mockResolvedValue({ id: "e1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveWorryEntry(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: {} } as never);

    expect(repo.saveWorryEntry).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useDeleteWorryEntry: mutationFn(entryId) -> deleteWorryEntry(userId, entryId)
// with an onSuccess guard that invalidates only the list key.
// ---------------------------------------------------------------------------
describe("useDeleteWorryEntry onSuccess guard", () => {
  it("deletes and invalidates the list for a real user", async () => {
    (repo.deleteWorryEntry as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteWorryEntry("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync("e1");

    expect(repo.deleteWorryEntry).toHaveBeenCalledWith("u1", "e1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["worry", "list", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.deleteWorryEntry as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteWorryEntry(null), { wrapper: wrap(client) });

    await result.current.mutateAsync("e1");

    expect(repo.deleteWorryEntry).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useToggleWorryResolved: mutationFn passes through the resolved flag and the
// onSuccess guard invalidates only the list key.
// ---------------------------------------------------------------------------
describe("useToggleWorryResolved onSuccess guard", () => {
  it("toggles and invalidates the list for a real user", async () => {
    (repo.toggleWorryResolved as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useToggleWorryResolved("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ entryId: "e1", resolved: true });

    expect(repo.toggleWorryResolved).toHaveBeenCalledWith("u1", "e1", true);
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["worry", "list", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.toggleWorryResolved as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useToggleWorryResolved(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ entryId: "e1", resolved: false });

    expect(repo.toggleWorryResolved).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});
