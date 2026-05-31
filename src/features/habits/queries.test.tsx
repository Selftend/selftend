import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useHabitLogs, useHabits } from "@/src/features/habits/queries";
import { listHabitLogs, listHabits } from "@/src/features/habits/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/habits/repository", () => ({
  archiveHabit: jest.fn(),
  deleteHabit: jest.fn(),
  getHabit: jest.fn(),
  listHabitLogs: jest.fn(),
  listHabits: jest.fn(),
  restoreHabit: jest.fn(),
  saveHabit: jest.fn(),
  toggleHabitLog: jest.fn(),
  upsertHabitLogNote: jest.fn(),
}));

const mockListHabitLogs = listHabitLogs as jest.MockedFunction<typeof listHabitLogs>;
const mockListHabits = listHabits as jest.MockedFunction<typeof listHabits>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useHabitLogs — queryKey scope derivation", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("builds a habit-scoped key when habitId is provided", async () => {
    mockListHabitLogs.mockResolvedValue([]);

    const { result } = renderHook(
      () => useHabitLogs("u1", { habitId: "h1", sinceDate: "2026-05-01", limit: 10 }),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert the exact computed key exists in the shared client's cache
    const expectedKey = ["habits", "logs", "u1", "habit:h1:2026-05-01:10"];
    expect(client.getQueryState(expectedKey)).toBeDefined();
  });

  it("builds an all-scope key when habitId is not provided", async () => {
    mockListHabitLogs.mockResolvedValue([]);

    const { result } = renderHook(() => useHabitLogs("u1", { sinceDate: "2026-05-01", limit: 5 }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert the exact computed key exists in the shared client's cache
    const expectedKey = ["habits", "logs", "u1", "all:2026-05-01:5"];
    expect(client.getQueryState(expectedKey)).toBeDefined();
  });

  it("habit-scoped and all-scoped hooks produce two distinct, both-present cache keys", async () => {
    mockListHabitLogs.mockResolvedValue([]);

    // Render both hooks into the SAME shared client
    const { result: r1 } = renderHook(
      () => useHabitLogs("u1", { habitId: "h1", sinceDate: "2026-05-01" }),
      { wrapper: makeWrapper(client) },
    );
    const { result: r2 } = renderHook(() => useHabitLogs("u1", { sinceDate: "2026-05-01" }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(r1.current.isSuccess).toBe(true));
    await waitFor(() => expect(r2.current.isSuccess).toBe(true));

    const habitScopedKey = ["habits", "logs", "u1", "habit:h1:2026-05-01:"];
    const allScopedKey = ["habits", "logs", "u1", "all:2026-05-01:"];

    // Both keys must exist and be independent entries in the same cache
    expect(client.getQueryState(habitScopedKey)).toBeDefined();
    expect(client.getQueryState(allScopedKey)).toBeDefined();
    // The two keys are different (not the same cache entry)
    expect(habitScopedKey).not.toEqual(allScopedKey);
  });

  it("does not fetch when userId is null", () => {
    renderHook(() => useHabitLogs(null, { habitId: "h1" }), { wrapper: makeWrapper(client) });
    expect(mockListHabitLogs).not.toHaveBeenCalled();
  });
});

describe("useHabits — includeArchived key folding", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("defaults includeArchived to false when not provided", async () => {
    mockListHabits.mockResolvedValue([]);

    const { result } = renderHook(() => useHabits("u1"), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListHabits).toHaveBeenCalledWith("u1", false);
  });

  it("passes includeArchived: true to the repository when provided", async () => {
    mockListHabits.mockResolvedValue([]);

    const { result } = renderHook(() => useHabits("u1", { includeArchived: true }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListHabits).toHaveBeenCalledWith("u1", true);
  });

  it("distinct includeArchived values produce two separate cache keys in the same client", async () => {
    mockListHabits.mockResolvedValue([]);

    // Render both variants into the SAME shared client
    const { result: r1 } = renderHook(() => useHabits("u1", { includeArchived: false }), {
      wrapper: makeWrapper(client),
    });
    const { result: r2 } = renderHook(() => useHabits("u1", { includeArchived: true }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(r1.current.isSuccess).toBe(true));
    await waitFor(() => expect(r2.current.isSuccess).toBe(true));

    // Assert exact keys exist in the shared cache
    const keyFalse = ["habits", "list", "u1", false];
    const keyTrue = ["habits", "list", "u1", true];

    expect(client.getQueryState(keyFalse)).toBeDefined();
    expect(client.getQueryState(keyTrue)).toBeDefined();
    // They must be separate entries
    expect(keyFalse).not.toEqual(keyTrue);
  });
});
