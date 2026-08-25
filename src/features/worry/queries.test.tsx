import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import * as repo from "@/src/features/worry/repository";
import {
  useDeleteWorryEntry,
  useLatestWorryEntryAt,
  useSaveWorryEntry,
  useToggleWorryResolved,
  useWorryEntries,
  useWorryEntry,
} from "@/src/features/worry/queries";
import { createAppQueryClient } from "@/src/lib/query-client";
import { useToastStore } from "@/src/stores/toast-store";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern already
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/worry/repository", () => ({
  deleteWorryEntry: jest.fn(),
  getLatestWorryEntryAt: jest.fn(),
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

describe("useLatestWorryEntryAt", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useLatestWorryEntryAt(null), { wrapper: wrap(client) });
    expect(repo.getLatestWorryEntryAt).not.toHaveBeenCalled();
  });

  // ADR-0001's cache-shape rule: the read hangs off the list key, so the invalidations
  // the tool's own mutations already fire reach it without a new invalidate call (#990).
  it("refetches when the list it summarises is invalidated", async () => {
    const client = createTestQueryClient();
    (repo.getLatestWorryEntryAt as jest.Mock).mockResolvedValue(null);
    renderHook(() => useLatestWorryEntryAt("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.getLatestWorryEntryAt).toHaveBeenCalledTimes(1));

    await client.invalidateQueries({ queryKey: ["worry", "list", "u1"] });

    await waitFor(() => expect(repo.getLatestWorryEntryAt).toHaveBeenCalledTimes(2));
  });
});

/**
 * ☠️ The delete on the detail screen fires from inside a native modal that STAYS OPEN -
 * `DeleteEntryButton`'s confirmation - so the global save-failed toast would be raised
 * behind it, and on Android nothing can lift a toast over a native modal (#1364, spec
 * §10). The dialog renders the failure inline instead.
 *
 * ⚠️ These run against the REAL `createAppQueryClient`, because the global toast lives on
 * its `MutationCache`. The screen's own test mocks this whole module, so its "no toast"
 * assertion cannot observe that cache at all - only these can.
 */
describe("deletes raised from behind a native modal", () => {
  let toastClient: QueryClient;

  beforeEach(() => {
    toastClient = createAppQueryClient();
    // The error toast is sticky, so the real teardown runs between cases.
    useToastStore.getState().clearToasts();
  });

  afterEach(() => {
    // Building a mutation schedules a long gc timer; production owns a process-long
    // client, but these short-lived ones would keep Jest alive.
    for (const mutation of toastClient.getMutationCache().getAll()) mutation.destroy();
    toastClient.clear();
  });

  // The control: without it, the absence assertion below could pass on an inert store.
  it("raises the global toast for a failing mutation that does NOT opt out", async () => {
    const mutation = toastClient.getMutationCache().build(toastClient, {
      mutationFn: () => Promise.reject(new TypeError("Network request failed")),
    });

    await mutation.execute(undefined).catch(() => {});

    expect(useToastStore.getState().visible).toMatchObject({ tone: "error" });
    mutation.destroy();
  });

  it("stays quiet when the delete fails, leaving the confirmation to show it", async () => {
    (repo.deleteWorryEntry as jest.Mock).mockRejectedValue(new TypeError("Network request failed"));
    const { result } = renderHook(() => useDeleteWorryEntry("u1"), { wrapper: wrap(toastClient) });

    await act(async () => {
      await result.current.mutateAsync("w1").catch(() => {});
    });

    expect(useToastStore.getState().visible).toBeNull();
  });
});
