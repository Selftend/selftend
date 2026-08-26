import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import * as repo from "@/src/features/beliefs/repository";
import {
  useCoreBelief,
  useCoreBeliefs,
  useDeleteCoreBelief,
  useLatestCoreBeliefAt,
  useSaveCoreBelief,
  useUpdateBeliefStrength,
} from "@/src/features/beliefs/queries";
import { createAppQueryClient } from "@/src/lib/query-client";
import { useToastStore } from "@/src/stores/toast-store";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern already
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/beliefs/repository", () => ({
  deleteCoreBelief: jest.fn(),
  getCoreBelief: jest.fn(),
  getLatestCoreBeliefAt: jest.fn(),
  listCoreBeliefs: jest.fn(),
  saveCoreBelief: jest.fn(),
  updateBeliefStrength: jest.fn(),
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
// useCoreBeliefs: enabled = Boolean(userId). queryFn must not run for a null
// user and must run (with the user id) for a real user.
// ---------------------------------------------------------------------------
describe("useCoreBeliefs enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useCoreBeliefs(null), { wrapper: wrap(client) });
    expect(repo.listCoreBeliefs).not.toHaveBeenCalled();
  });

  it("fetches with the user id when userId is present", async () => {
    (repo.listCoreBeliefs as jest.Mock).mockResolvedValue([{ id: "b1" }]);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useCoreBeliefs("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(repo.listCoreBeliefs).toHaveBeenCalledWith("u1");
    expect(result.current.data).toEqual([{ id: "b1" }]);
  });
});

// ---------------------------------------------------------------------------
// useCoreBelief: enabled = Boolean(userId && beliefId). Cover all three branch
// states of the two-id gate: userId missing, beliefId missing, both present.
// ---------------------------------------------------------------------------
describe("useCoreBelief enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useCoreBelief(null, "b1"), { wrapper: wrap(client) });
    expect(repo.getCoreBelief).not.toHaveBeenCalled();
  });

  it("does not fetch when beliefId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useCoreBelief("u1", null), { wrapper: wrap(client) });
    expect(repo.getCoreBelief).not.toHaveBeenCalled();
  });

  it("fetches with both ids when userId and beliefId are present", async () => {
    (repo.getCoreBelief as jest.Mock).mockResolvedValue({ id: "b1" });
    const client = createTestQueryClient();
    const { result } = renderHook(() => useCoreBelief("u1", "b1"), { wrapper: wrap(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(repo.getCoreBelief).toHaveBeenCalledWith("u1", "b1");
    expect(result.current.data).toEqual({ id: "b1" });
  });
});

// ---------------------------------------------------------------------------
// useSaveCoreBelief: onSuccess guard `if (!userId) return;` plus a Promise.all
// that invalidates BOTH the list key and the detail key derived from the
// resolved belief's id. Cover the real-user path (both keys asserted) and the
// null-user path (guard short-circuits, no invalidation).
// ---------------------------------------------------------------------------
describe("useSaveCoreBelief onSuccess guard", () => {
  it("invalidates the list and the resolved detail key for a real user", async () => {
    (repo.saveCoreBelief as jest.Mock).mockResolvedValue({ id: "b9" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveCoreBelief("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: {} } as never);

    expect(repo.saveCoreBelief).toHaveBeenCalledWith("u1", {}, undefined);
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["beliefs", "list", "u1"]);
    expect(queryKeys).toContainEqual(["beliefs", "detail", "u1", "b9"]);
  });

  it("passes beliefId through to the repository when editing", async () => {
    (repo.saveCoreBelief as jest.Mock).mockResolvedValue({ id: "b9" });
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveCoreBelief("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: {}, beliefId: "b9" } as never);

    expect(repo.saveCoreBelief).toHaveBeenCalledWith("u1", {}, "b9");
  });

  it("skips invalidation when userId is null", async () => {
    (repo.saveCoreBelief as jest.Mock).mockResolvedValue({ id: "b9" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveCoreBelief(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: {} } as never);

    expect(repo.saveCoreBelief).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useDeleteCoreBelief: onSuccess guard `if (!userId) return;` -> invalidates
// the top-level `["beliefs"]` prefix. Cover real-user and null-user branches.
// ---------------------------------------------------------------------------
describe("useDeleteCoreBelief onSuccess guard", () => {
  it("deletes and invalidates the beliefs prefix for a real user", async () => {
    (repo.deleteCoreBelief as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteCoreBelief("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync("b1" as never);

    expect(repo.deleteCoreBelief).toHaveBeenCalledWith("u1", "b1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["beliefs"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.deleteCoreBelief as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteCoreBelief(null), { wrapper: wrap(client) });

    await result.current.mutateAsync("b1" as never);

    expect(repo.deleteCoreBelief).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useUpdateBeliefStrength: onSuccess guard `if (!userId) return;` -> invalidates
// the top-level `["beliefs"]` prefix. Cover real-user and null-user branches.
// ---------------------------------------------------------------------------
describe("useUpdateBeliefStrength onSuccess guard", () => {
  it("updates strengths and invalidates the beliefs prefix for a real user", async () => {
    (repo.updateBeliefStrength as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateBeliefStrength("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({
      beliefId: "b1",
      originalBeliefStrength: 80,
      alternativeBeliefStrength: 20,
    } as never);

    expect(repo.updateBeliefStrength).toHaveBeenCalledWith("u1", "b1", 80, 20);
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["beliefs"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.updateBeliefStrength as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateBeliefStrength(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({
      beliefId: "b1",
      originalBeliefStrength: 80,
      alternativeBeliefStrength: 20,
    } as never);

    expect(repo.updateBeliefStrength).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("useLatestCoreBeliefAt", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useLatestCoreBeliefAt(null), { wrapper: wrap(client) });
    expect(repo.getLatestCoreBeliefAt).not.toHaveBeenCalled();
  });

  // ADR-0001's cache-shape rule: the read hangs off the list key, so the invalidations
  // the tool's own mutations already fire reach it without a new invalidate call (#990).
  it("refetches when the list it summarises is invalidated", async () => {
    const client = createTestQueryClient();
    (repo.getLatestCoreBeliefAt as jest.Mock).mockResolvedValue(null);
    renderHook(() => useLatestCoreBeliefAt("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.getLatestCoreBeliefAt).toHaveBeenCalledTimes(1));

    await client.invalidateQueries({ queryKey: ["beliefs", "list", "u1"] });

    await waitFor(() => expect(repo.getLatestCoreBeliefAt).toHaveBeenCalledTimes(2));
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
    (repo.deleteCoreBelief as jest.Mock).mockRejectedValue(new TypeError("Network request failed"));
    const { result } = renderHook(() => useDeleteCoreBelief("u1"), { wrapper: wrap(toastClient) });

    await act(async () => {
      await result.current.mutateAsync("b1").catch(() => {});
    });

    expect(useToastStore.getState().visible).toBeNull();
  });
});
