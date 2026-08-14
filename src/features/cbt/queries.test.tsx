import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useArchiveThoughtRecord,
  useLatestThoughtRecordAt,
  useSaveThoughtRecord,
  useThoughtRecord,
  useThoughtRecordCountSince,
  useThoughtRecords,
} from "@/src/features/cbt/queries";
import * as repo from "@/src/features/cbt/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern already
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/cbt/repository", () => ({
  archiveThoughtRecord: jest.fn(),
  countThoughtRecords: jest.fn(),
  countThoughtRecordsSince: jest.fn(),
  getLatestThoughtRecordAt: jest.fn(),
  getThoughtRecord: jest.fn(),
  listThoughtRecords: jest.fn(),
  saveThoughtRecord: jest.fn(),
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
// useThoughtRecords: enabled = Boolean(userId). Cover both branches.
// ---------------------------------------------------------------------------
describe("useThoughtRecords enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useThoughtRecords(null), { wrapper: wrap(client) });
    expect(repo.listThoughtRecords).not.toHaveBeenCalled();
  });

  it("fetches with the userId when present", async () => {
    const client = createTestQueryClient();
    renderHook(() => useThoughtRecords("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.listThoughtRecords).toHaveBeenCalledWith("u1"));
  });
});

// ---------------------------------------------------------------------------
// useThoughtRecord: enabled = Boolean(userId && recordId). All three arms of
// the two-id detail gate.
// ---------------------------------------------------------------------------
describe("useThoughtRecord two-id detail gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useThoughtRecord(null, "r1"), { wrapper: wrap(client) });
    expect(repo.getThoughtRecord).not.toHaveBeenCalled();
  });

  it("does not fetch when recordId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useThoughtRecord("u1", null), { wrapper: wrap(client) });
    expect(repo.getThoughtRecord).not.toHaveBeenCalled();
  });

  it("fetches when both userId and recordId are present", async () => {
    const client = createTestQueryClient();
    renderHook(() => useThoughtRecord("u1", "r1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.getThoughtRecord).toHaveBeenCalledWith("u1", "r1"));
  });
});

// ---------------------------------------------------------------------------
// useThoughtRecordCountSince: enabled = Boolean(userId). Cover both branches.
// ---------------------------------------------------------------------------
describe("useThoughtRecordCountSince enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useThoughtRecordCountSince(null, "2026-01-01T00:00:00.000Z"), {
      wrapper: wrap(client),
    });
    expect(repo.countThoughtRecordsSince).not.toHaveBeenCalled();
  });

  it("fetches with userId and sinceIso when present", async () => {
    (repo.countThoughtRecordsSince as jest.Mock).mockResolvedValue(3);
    const client = createTestQueryClient();
    const since = "2026-01-01T00:00:00.000Z";
    const { result } = renderHook(() => useThoughtRecordCountSince("u1", since), {
      wrapper: wrap(client),
    });
    await waitFor(() => expect(repo.countThoughtRecordsSince).toHaveBeenCalledWith("u1", since));
    await waitFor(() => expect(result.current.data).toBe(3));
  });
});

// ---------------------------------------------------------------------------
// useSaveThoughtRecord: onSuccess guard `if (!userId) return;`. For a real
// user it primes the single-record cache via setQueryData then Promise.all of
// the records list + record(id) invalidations.
// ---------------------------------------------------------------------------
describe("useSaveThoughtRecord onSuccess cache priming", () => {
  it("primes the record key and invalidates records + record(id) for a real user", async () => {
    const saved = { id: "rec-1", situation: "s" };
    (repo.saveThoughtRecord as jest.Mock).mockResolvedValue(saved);
    const client = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const setDataSpy = jest.spyOn(client, "setQueryData");
    const { result } = renderHook(() => useSaveThoughtRecord("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: {} as never, recordId: undefined });

    expect(repo.saveThoughtRecord).toHaveBeenCalledWith("u1", {}, undefined);

    // Primed the single-record cache with the exact saved record under record(id).
    expect(setDataSpy).toHaveBeenCalledWith(["cbt", "record", "u1", "rec-1"], saved);
    expect(client.getQueryData(["cbt", "record", "u1", "rec-1"])).toBe(saved);

    // Promise.all invalidated both the records list key and the record(id) key.
    const queryKeys = invalidateSpy.mock.calls.map(
      (c) => (c[0] as { queryKey?: unknown }).queryKey,
    );
    expect(queryKeys).toContainEqual(["cbt", "records", "u1"]);
    expect(queryKeys).toContainEqual(["cbt", "record", "u1", "rec-1"]);
  });

  it("skips priming and invalidation when userId is null", async () => {
    const saved = { id: "rec-1", situation: "s" };
    (repo.saveThoughtRecord as jest.Mock).mockResolvedValue(saved);
    const client = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const setDataSpy = jest.spyOn(client, "setQueryData");
    const { result } = renderHook(() => useSaveThoughtRecord(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: {} as never, recordId: undefined });

    expect(repo.saveThoughtRecord).toHaveBeenCalled();
    expect(setDataSpy).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useArchiveThoughtRecord: onSuccess guard `if (!userId) return;`.
// ---------------------------------------------------------------------------
describe("useArchiveThoughtRecord onSuccess guard", () => {
  it("invalidates the records list for a real user", async () => {
    (repo.archiveThoughtRecord as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useArchiveThoughtRecord("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync("rec-1");

    expect(repo.archiveThoughtRecord).toHaveBeenCalledWith("u1", "rec-1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["cbt", "records", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.archiveThoughtRecord as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useArchiveThoughtRecord(null), { wrapper: wrap(client) });

    await result.current.mutateAsync("rec-1");

    expect(repo.archiveThoughtRecord).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("useLatestThoughtRecordAt", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useLatestThoughtRecordAt(null), { wrapper: wrap(client) });
    expect(repo.getLatestThoughtRecordAt).not.toHaveBeenCalled();
  });

  // ADR-0001's cache-shape rule: the read hangs off the list key, so the invalidations
  // the tool's own mutations already fire reach it without a new invalidate call (#990).
  it("refetches when the list it summarises is invalidated", async () => {
    const client = createTestQueryClient();
    (repo.getLatestThoughtRecordAt as jest.Mock).mockResolvedValue(null);
    renderHook(() => useLatestThoughtRecordAt("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.getLatestThoughtRecordAt).toHaveBeenCalledTimes(1));

    await client.invalidateQueries({ queryKey: ["cbt", "records", "u1"] });

    await waitFor(() => expect(repo.getLatestThoughtRecordAt).toHaveBeenCalledTimes(2));
  });
});
