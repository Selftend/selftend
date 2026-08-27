import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useAllExposureItems,
  useDeleteHierarchy,
  useExposureItems,
  useExposureSessions,
  useHierarchies,
  useHierarchy,
  useLatestExposureSessionAt,
  useRecentExposureSessions,
  useSaveExposureSession,
  useSaveHierarchy,
} from "@/src/features/exposure/queries";
import * as repo from "@/src/features/exposure/repository";
import { createAppQueryClient } from "@/src/lib/query-client";
import { useToastStore } from "@/src/stores/toast-store";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern.
jest.mock("@/src/features/exposure/repository", () => ({
  deleteHierarchy: jest.fn(),
  getHierarchy: jest.fn(),
  getLatestExposureSessionAt: jest.fn(),
  listAllItems: jest.fn(),
  listHierarchies: jest.fn(),
  listItems: jest.fn(),
  listRecentSessions: jest.fn(),
  listSessions: jest.fn(),
  saveHierarchy: jest.fn(),
  saveItems: jest.fn(),
  saveSession: jest.fn(),
}));

const mockSaveHierarchy = repo.saveHierarchy as jest.MockedFunction<typeof repo.saveHierarchy>;
const mockSaveItems = repo.saveItems as jest.MockedFunction<typeof repo.saveItems>;
const mockSaveSession = repo.saveSession as jest.MockedFunction<typeof repo.saveSession>;
const mockDeleteHierarchy = repo.deleteHierarchy as jest.MockedFunction<
  typeof repo.deleteHierarchy
>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
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
// Single-id list hooks: enabled = Boolean(userId). Cover both branches of the
// gate and the queryKey ternary (userId truthy vs anonymous fallback).
// ---------------------------------------------------------------------------
const listHooks = [
  ["useHierarchies", useHierarchies, repo.listHierarchies],
  ["useAllExposureItems", useAllExposureItems, repo.listAllItems],
] as const;

describe.each(listHooks)("%s enabled gate", (_name, useHook, repoFn) => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null) => unknown)(null), {
      wrapper: makeWrapper(client),
    });
    expect(repoFn).not.toHaveBeenCalled();
  });

  it("fetches with the real userId when present", async () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null) => unknown)("u1"), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(repoFn).toHaveBeenCalledWith("u1"));
  });
});

// Same enabled gate, but the repo fn also receives the limit (#123: feeds the
// routines derive engine's "any session completed on day X").
describe("useRecentExposureSessions enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useRecentExposureSessions(null), { wrapper: makeWrapper(client) });
    expect(repo.listRecentSessions).not.toHaveBeenCalled();
  });

  it("fetches with the real userId and limit when present", async () => {
    const client = createTestQueryClient();
    renderHook(() => useRecentExposureSessions("u1", 250), { wrapper: makeWrapper(client) });
    await waitFor(() => expect(repo.listRecentSessions).toHaveBeenCalledWith("u1", 250));
  });
});

// ---------------------------------------------------------------------------
// Two-id detail/list hooks: enabled = Boolean(userId && secondaryId). Cover all
// three states of the `&&`: userId missing, secondaryId missing, both present.
// ---------------------------------------------------------------------------
const twoIdHooks = [
  ["useHierarchy", useHierarchy, repo.getHierarchy],
  ["useExposureItems", useExposureItems, repo.listItems],
  ["useExposureSessions", useExposureSessions, repo.listSessions],
] as const;

describe.each(twoIdHooks)("%s enabled gate", (_name, useHook, repoFn) => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null, s: string | null) => unknown)(null, "x1"), {
      wrapper: makeWrapper(client),
    });
    expect(repoFn).not.toHaveBeenCalled();
  });

  it("does not fetch when the secondary id is null", () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null, s: string | null) => unknown)("u1", null), {
      wrapper: makeWrapper(client),
    });
    expect(repoFn).not.toHaveBeenCalled();
  });

  it("fetches with both ids when both are present", async () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null, s: string | null) => unknown)("u1", "x1"), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(repoFn).toHaveBeenCalledWith("u1", "x1"));
  });
});

// ---------------------------------------------------------------------------
// useSaveHierarchy: mutationFn chains saveHierarchy -> saveItems; onSuccess
// guard `if (!userId) return;` invalidates the "exposure" root for a real user.
// ---------------------------------------------------------------------------
describe("useSaveHierarchy", () => {
  it("calls saveHierarchy then saveItems with the returned hierarchy id", async () => {
    const hierarchy = { id: "h1", userId: "u1", title: "Test", anxietyType: "social" } as never;
    mockSaveHierarchy.mockResolvedValue(hierarchy);
    mockSaveItems.mockResolvedValue();

    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveHierarchy("u1"), {
      wrapper: makeWrapper(client),
    });

    const items = [{ description: "Step 1", sudsRating: 30 } as never];

    await act(async () => {
      await result.current.mutateAsync({
        input: { title: "Test", anxietyType: "social" } as never,
        items,
      });
    });

    expect(mockSaveHierarchy).toHaveBeenCalledWith("u1", { title: "Test", anxietyType: "social" });
    expect(mockSaveItems).toHaveBeenCalledWith("u1", "h1", items);
    // saveHierarchy must be called before saveItems
    const hierarchyOrder = mockSaveHierarchy.mock.invocationCallOrder[0];
    const itemsOrder = mockSaveItems.mock.invocationCallOrder[0];
    expect(hierarchyOrder).toBeLessThan(itemsOrder);
  });

  it("returns the saved hierarchy", async () => {
    const hierarchy = { id: "h1", userId: "u1", title: "Test", anxietyType: "social" } as never;
    mockSaveHierarchy.mockResolvedValue(hierarchy);
    mockSaveItems.mockResolvedValue();

    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveHierarchy("u1"), {
      wrapper: makeWrapper(client),
    });

    let returned: unknown;
    await act(async () => {
      returned = await result.current.mutateAsync({ input: { title: "Test" } as never, items: [] });
    });

    expect(returned).toBe(hierarchy);
  });

  it("invalidates the exposure root key for a real user", async () => {
    mockSaveHierarchy.mockResolvedValue({ id: "h1" } as never);
    mockSaveItems.mockResolvedValue();

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveHierarchy("u1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ input: { title: "T" } as never, items: [] });
    });

    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["exposure"]);
  });

  it("skips invalidation when userId is null", async () => {
    mockSaveHierarchy.mockResolvedValue({ id: "h1" } as never);
    mockSaveItems.mockResolvedValue();

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveHierarchy(null), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ input: { title: "T" } as never, items: [] });
    });

    expect(mockSaveHierarchy).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useSaveExposureSession: onSuccess guard + a Promise.all whose second entry is
// a hierarchyId-gated items invalidation (ternary -> Promise.resolve otherwise).
// ---------------------------------------------------------------------------
describe("useSaveExposureSession", () => {
  it("invalidates only the all exposure key when hierarchyId is null", async () => {
    mockSaveSession.mockResolvedValue({ id: "s1" } as never);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSaveExposureSession("u1", null), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        itemId: "item1",
        input: { preSuds: 50, postSuds: 20 } as never,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should be called with "all" exposure key only
    const allCalls = spy.mock.calls.map((c) => c[0]);
    const queryKeys = allCalls.map((c) => (c as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["exposure"]);
    // Should NOT contain an items key with a hierarchyId
    const itemsWithHierarchy = queryKeys.filter(
      (k) => Array.isArray(k) && k[0] === "exposure" && k[1] === "items" && k.length > 3,
    );
    expect(itemsWithHierarchy).toHaveLength(0);
  });

  it("also invalidates the items key for the hierarchy when hierarchyId is present", async () => {
    mockSaveSession.mockResolvedValue({ id: "s1" } as never);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSaveExposureSession("u1", "h1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        itemId: "item1",
        input: { preSuds: 50, postSuds: 20 } as never,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const allCalls = spy.mock.calls.map((c) => c[0]);
    const queryKeys = allCalls.map((c) => (c as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["exposure"]);
    expect(queryKeys).toContainEqual(["exposure", "items", "u1", "h1"]);
  });

  it("skips invalidation when userId is null", async () => {
    mockSaveSession.mockResolvedValue({ id: "s1" } as never);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSaveExposureSession(null, "h1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        itemId: "item1",
        input: { preSuds: 50, postSuds: 20 } as never,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSaveSession).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useDeleteHierarchy: mutationFn delegates to deleteHierarchy(userId, id) and
// its onSuccess guard invalidates the "exposure" root for a real user only.
// ---------------------------------------------------------------------------
describe("useDeleteHierarchy", () => {
  it("deletes and invalidates the exposure root for a real user", async () => {
    mockDeleteHierarchy.mockResolvedValue();

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteHierarchy("u1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync("h1");
    });

    expect(mockDeleteHierarchy).toHaveBeenCalledWith("u1", "h1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["exposure"]);
  });

  it("skips invalidation when userId is null", async () => {
    mockDeleteHierarchy.mockResolvedValue();

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteHierarchy(null), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync("h1");
    });

    expect(mockDeleteHierarchy).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("useLatestExposureSessionAt", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useLatestExposureSessionAt(null), { wrapper: makeWrapper(client) });
    expect(repo.getLatestExposureSessionAt).not.toHaveBeenCalled();
  });

  // ADR-0001's cache-shape rule: the read hangs off the list key, so the invalidations
  // the tool's own mutations already fire reach it without a new invalidate call (#990).
  it("refetches when the list it summarises is invalidated", async () => {
    const client = createTestQueryClient();
    (repo.getLatestExposureSessionAt as jest.Mock).mockResolvedValue(null);
    renderHook(() => useLatestExposureSessionAt("u1"), { wrapper: makeWrapper(client) });
    await waitFor(() => expect(repo.getLatestExposureSessionAt).toHaveBeenCalledTimes(1));

    await client.invalidateQueries({ queryKey: ["exposure"] });

    await waitFor(() => expect(repo.getLatestExposureSessionAt).toHaveBeenCalledTimes(2));
  });
});

/**
 * ☠️ Both writes on the detail screen fire from inside a native modal that STAYS OPEN -
 * the session sheet and the delete confirmation - so the global save-failed toast would
 * be raised behind them, and on Android nothing can lift a toast over a native modal
 * (#1335, spec §10). Each surface renders its failure inline instead.
 *
 * ⚠️ These run against the REAL `createAppQueryClient`, because the global toast lives on
 * its `MutationCache`. The screen's own test mocks this whole module, so its "no toast"
 * assertion cannot observe that cache at all - only these can.
 */
describe("writes raised from behind a native modal", () => {
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

  // The control: without it, both absence assertions below could pass on an inert store.
  it("raises the global toast for a failing mutation that does NOT opt out", async () => {
    const mutation = toastClient.getMutationCache().build(toastClient, {
      mutationFn: () => Promise.reject(new TypeError("Network request failed")),
    });

    await mutation.execute(undefined).catch(() => {});

    expect(useToastStore.getState().visible).toMatchObject({ tone: "error" });
    mutation.destroy();
  });

  it("stays quiet when the session save fails, leaving the sheet to show it", async () => {
    mockSaveSession.mockRejectedValue(new TypeError("Network request failed"));
    const { result } = renderHook(() => useSaveExposureSession("u1", "h1"), {
      wrapper: makeWrapper(toastClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ itemId: "i1", input: {} as never }).catch(() => {});
    });

    expect(useToastStore.getState().visible).toBeNull();
  });

  it("stays quiet when the delete fails, leaving the confirmation to show it", async () => {
    mockDeleteHierarchy.mockRejectedValue(new TypeError("Network request failed"));
    const { result } = renderHook(() => useDeleteHierarchy("u1"), {
      wrapper: makeWrapper(toastClient),
    });

    await act(async () => {
      await result.current.mutateAsync("h1").catch(() => {});
    });

    expect(useToastStore.getState().visible).toBeNull();
  });
});
