import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useDeleteSleepLog,
  useSaveSleepLog,
  useSleepLog,
  useSleepLogCount,
  useSleepLogs,
} from "@/src/features/sleep/queries";
import * as repo from "@/src/features/sleep/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern already
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/sleep/repository", () => ({
  countSleepLogs: jest.fn(),
  deleteSleepLog: jest.fn(),
  getSleepLog: jest.fn(),
  listSleepLogs: jest.fn(),
  saveSleepLog: jest.fn(),
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
  ["useSleepLogs", useSleepLogs, repo.listSleepLogs],
  ["useSleepLogCount", useSleepLogCount, repo.countSleepLogs],
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

describe("useSleepLogs", () => {
  it("passes userId and limit through to the repository and returns the rows", async () => {
    const rows = [{ id: "log-1" }];
    (repo.listSleepLogs as jest.Mock).mockResolvedValue(rows);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSleepLogs("u1", 10), { wrapper: wrap(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(repo.listSleepLogs).toHaveBeenCalledWith("u1", 10);
    expect(result.current.data).toBe(rows);
  });
});

describe("useSleepLogCount", () => {
  it("returns the resolved count", async () => {
    (repo.countSleepLogs as jest.Mock).mockResolvedValue(7);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSleepLogCount("u1"), { wrapper: wrap(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(repo.countSleepLogs).toHaveBeenCalledWith("u1");
    expect(result.current.data).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// Detail hook: enabled = Boolean(userId && id). Cover all three branches:
// userId missing, id missing, both present.
// ---------------------------------------------------------------------------
describe("useSleepLog enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useSleepLog(null, "x1"), { wrapper: wrap(client) });
    expect(repo.getSleepLog).not.toHaveBeenCalled();
  });

  it("does not fetch when the id is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useSleepLog("u1", null), { wrapper: wrap(client) });
    expect(repo.getSleepLog).not.toHaveBeenCalled();
  });

  it("fetches when both userId and id are present", async () => {
    const row = { id: "x1" };
    (repo.getSleepLog as jest.Mock).mockResolvedValue(row);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSleepLog("u1", "x1"), { wrapper: wrap(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(repo.getSleepLog).toHaveBeenCalledWith("u1", "x1");
    expect(result.current.data).toBe(row);
  });
});

// ---------------------------------------------------------------------------
// useSaveSleepLog: onSuccess guard `if (!userId) return;`. Cover both branches:
// null userId (guard short-circuits, no invalidate) and a real userId
// (mutationFn runs + invalidateQueries fires with the exact `sleep` root key).
// ---------------------------------------------------------------------------
describe("useSaveSleepLog onSuccess guard", () => {
  it("runs the mutation and invalidates the sleep root key for a real user", async () => {
    (repo.saveSleepLog as jest.Mock).mockResolvedValue({ id: "log-1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveSleepLog("u1"), { wrapper: wrap(client) });

    const input = { durationMinutes: 420, quality: 4, notes: "ok" };
    await result.current.mutateAsync({ input } as never);

    expect(repo.saveSleepLog).toHaveBeenCalledWith("u1", input, undefined);
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["sleep"]);
  });

  it("forwards the optional logId to the repository", async () => {
    (repo.saveSleepLog as jest.Mock).mockResolvedValue({ id: "log-1" });
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveSleepLog("u1"), { wrapper: wrap(client) });

    const input = { durationMinutes: 420, quality: 4, notes: "ok" };
    await result.current.mutateAsync({ input, logId: "log-1" } as never);

    expect(repo.saveSleepLog).toHaveBeenCalledWith("u1", input, "log-1");
  });

  it("skips invalidation when userId is null", async () => {
    (repo.saveSleepLog as jest.Mock).mockResolvedValue({ id: "log-1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveSleepLog(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: {} } as never);

    expect(repo.saveSleepLog).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useDeleteSleepLog: delegates to useDeleteMutation(userId, deleteSleepLog,
// sleepKeys.all). Real user -> deleteFn called with (userId, id) and the sleep
// root key is invalidated. Null user -> guard short-circuits, no invalidate.
// ---------------------------------------------------------------------------
describe("useDeleteSleepLog", () => {
  it("deletes and invalidates the sleep root key for a real user", async () => {
    (repo.deleteSleepLog as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteSleepLog("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync("log-1" as never);

    expect(repo.deleteSleepLog).toHaveBeenCalledWith("u1", "log-1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["sleep"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.deleteSleepLog as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteSleepLog(null), { wrapper: wrap(client) });

    await result.current.mutateAsync("log-1" as never);

    expect(repo.deleteSleepLog).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});
