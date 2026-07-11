import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import * as repo from "@/src/features/anger/repository";
import {
  useAngerLog,
  useAngerLogs,
  useDeleteAngerLog,
  useSaveAngerLog,
} from "@/src/features/anger/queries";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so mirror the explicit-factory pattern
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/anger/repository", () => ({
  deleteAngerLog: jest.fn(),
  getAngerLog: jest.fn(),
  listAngerLogs: jest.fn(),
  saveAngerLog: jest.fn(),
}));

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Every repo fn resolves to a benign value so queryFn/mutationFn don't throw.
  (repo.listAngerLogs as jest.Mock).mockResolvedValue([]);
  (repo.getAngerLog as jest.Mock).mockResolvedValue(null);
  (repo.saveAngerLog as jest.Mock).mockResolvedValue({ id: "log-1" });
  (repo.deleteAngerLog as jest.Mock).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// useAngerLogs: enabled = Boolean(userId). Cover both the null gate (queryFn
// never runs, anonymous key) and the real-user path (queryFn runs).
// ---------------------------------------------------------------------------
describe("useAngerLogs enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useAngerLogs(null), { wrapper: wrap(client) });
    expect(repo.listAngerLogs).not.toHaveBeenCalled();
  });

  it("fetches with the user id when userId is present", async () => {
    const client = createTestQueryClient();
    renderHook(() => useAngerLogs("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.listAngerLogs).toHaveBeenCalledWith("u1"));
  });
});

// ---------------------------------------------------------------------------
// useAngerLog: enabled = Boolean(userId && logId). Cover all three branches of
// the two-id gate: userId missing, logId missing, both present.
// ---------------------------------------------------------------------------
describe("useAngerLog enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useAngerLog(null, "log-1"), { wrapper: wrap(client) });
    expect(repo.getAngerLog).not.toHaveBeenCalled();
  });

  it("does not fetch when logId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useAngerLog("u1", null), { wrapper: wrap(client) });
    expect(repo.getAngerLog).not.toHaveBeenCalled();
  });

  it("fetches with both ids when userId and logId are present", async () => {
    const client = createTestQueryClient();
    renderHook(() => useAngerLog("u1", "log-1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.getAngerLog).toHaveBeenCalledWith("u1", "log-1"));
  });
});

// ---------------------------------------------------------------------------
// useSaveAngerLog: onSuccess guard `if (!userId) return;` plus a Promise.all
// that invalidates both the list key and the detail key derived from the
// resolved log id. Assert the exact keys against the local key factory.
// ---------------------------------------------------------------------------
describe("useSaveAngerLog onSuccess guard", () => {
  it("invalidates the list and the detail key for a real user", async () => {
    (repo.saveAngerLog as jest.Mock).mockResolvedValue({ id: "log-9" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveAngerLog("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: {} as never });

    expect(repo.saveAngerLog).toHaveBeenCalledWith("u1", {}, undefined);
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["anger", "list", "u1"]);
    expect(queryKeys).toContainEqual(["anger", "detail", "u1", "log-9"]);
  });

  it("passes the logId through to the repository for an update", async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveAngerLog("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: {} as never, logId: "existing" });

    expect(repo.saveAngerLog).toHaveBeenCalledWith("u1", {}, "existing");
  });

  it("skips invalidation when userId is null", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveAngerLog(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: {} as never });

    expect(repo.saveAngerLog).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useDeleteAngerLog: onSuccess guard `if (!userId) return;` plus a single list
// invalidation. Cover the real-user path (deleteFn args + invalidation key)
// and the null-user guard (invalidate never runs).
// ---------------------------------------------------------------------------
describe("useDeleteAngerLog onSuccess guard", () => {
  it("deletes and invalidates the list for a real user", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteAngerLog("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync("log-1");

    expect(repo.deleteAngerLog).toHaveBeenCalledWith("u1", "log-1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["anger", "list", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteAngerLog(null), { wrapper: wrap(client) });

    await result.current.mutateAsync("log-1");

    expect(repo.deleteAngerLog).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});
