import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  HABITS_HISTORY_PAGE_SIZE,
  useArchiveHabit,
  useDeleteHabit,
  useHabit,
  useHabitLogs,
  useHabitLogPages,
  useHabits,
  useRestoreHabit,
  useSaveHabit,
  useToggleHabitLog,
  useUpsertHabitLogNote,
} from "@/src/features/habits/queries";
import {
  archiveHabit,
  deleteHabit,
  getHabit,
  listHabitLogs,
  listHabitLogsPage,
  listHabits,
  restoreHabit,
  saveHabit,
  toggleHabitLog,
  upsertHabitLogNote,
} from "@/src/features/habits/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/habits/repository", () => ({
  archiveHabit: jest.fn(),
  deleteHabit: jest.fn(),
  getHabit: jest.fn(),
  listHabitLogs: jest.fn(),
  listHabitLogsPage: jest.fn(),
  listHabits: jest.fn(),
  restoreHabit: jest.fn(),
  saveHabit: jest.fn(),
  toggleHabitLog: jest.fn(),
  upsertHabitLogNote: jest.fn(),
}));

const mockListHabitLogs = listHabitLogs as jest.MockedFunction<typeof listHabitLogs>;
const mockListHabitLogsPage = listHabitLogsPage as jest.MockedFunction<typeof listHabitLogsPage>;
const mockListHabits = listHabits as jest.MockedFunction<typeof listHabits>;
const mockGetHabit = getHabit as jest.MockedFunction<typeof getHabit>;
const mockSaveHabit = saveHabit as jest.MockedFunction<typeof saveHabit>;
const mockArchiveHabit = archiveHabit as jest.MockedFunction<typeof archiveHabit>;
const mockRestoreHabit = restoreHabit as jest.MockedFunction<typeof restoreHabit>;
const mockDeleteHabit = deleteHabit as jest.MockedFunction<typeof deleteHabit>;
const mockToggleHabitLog = toggleHabitLog as jest.MockedFunction<typeof toggleHabitLog>;
const mockUpsertHabitLogNote = upsertHabitLogNote as jest.MockedFunction<typeof upsertHabitLogNote>;

// The single invalidation key every habit mutation fans out to.
const habitsAllKey = ["habits"] as const;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useHabitLogs - queryKey scope derivation", () => {
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

    // Assert the exact computed key exists in the shared client's cache. The
    // scope is a structured object, not a formatted string, so an optimistic
    // writer can read the window off the key rather than parse it back (#759).
    const expectedKey = [
      "habits",
      "logs",
      "u1",
      { habitId: "h1", sinceDate: "2026-05-01", limit: 10 },
    ];
    expect(client.getQueryState(expectedKey)).toBeDefined();
  });

  it("builds an all-scope key when habitId is not provided", async () => {
    mockListHabitLogs.mockResolvedValue([]);

    const { result } = renderHook(() => useHabitLogs("u1", { sinceDate: "2026-05-01", limit: 5 }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert the exact computed key exists in the shared client's cache
    const expectedKey = ["habits", "logs", "u1", { sinceDate: "2026-05-01", limit: 5 }];
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

    const habitScopedKey = ["habits", "logs", "u1", { habitId: "h1", sinceDate: "2026-05-01" }];
    const allScopedKey = ["habits", "logs", "u1", { sinceDate: "2026-05-01" }];

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

describe("useHabitLogPages", () => {
  it("uses the final day and id as the next cursor", async () => {
    const full = Array.from({ length: HABITS_HISTORY_PAGE_SIZE }, (_, i) => ({
      id: `log-${i}`,
      loggedOn: `2026-08-${String(31 - i).padStart(2, "0")}`,
    }));
    mockListHabitLogsPage.mockResolvedValueOnce(full as never).mockResolvedValueOnce([]);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useHabitLogPages("u1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    expect(mockListHabitLogsPage).toHaveBeenCalledWith("u1", HABITS_HISTORY_PAGE_SIZE, null);
    await result.current.fetchNextPage();
    await waitFor(() =>
      expect(mockListHabitLogsPage).toHaveBeenLastCalledWith("u1", HABITS_HISTORY_PAGE_SIZE, {
        timestamp: full.at(-1)!.loggedOn,
        id: full.at(-1)!.id,
      }),
    );
  });
});

describe("useHabits - includeArchived key folding", () => {
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

  it("does not fetch when userId is null (enabled gate)", () => {
    const client = createTestQueryClient();
    renderHook(() => useHabits(null, { includeArchived: true }), { wrapper: makeWrapper(client) });
    expect(mockListHabits).not.toHaveBeenCalled();
    // The anonymous fallback key is still what the disabled query registers under.
    expect(client.getQueryState(["habits", "list", "anonymous", true])).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// useHabit detail hook: enabled = Boolean(userId && id). Cover all three
// branches of the two-id gate.
// ---------------------------------------------------------------------------
describe("useHabit - two-id enabled gate", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("does not fetch when userId is null", () => {
    renderHook(() => useHabit(null, "h1"), { wrapper: makeWrapper(client) });
    expect(mockGetHabit).not.toHaveBeenCalled();
  });

  it("does not fetch when the habit id is null", () => {
    renderHook(() => useHabit("u1", null), { wrapper: makeWrapper(client) });
    expect(mockGetHabit).not.toHaveBeenCalled();
  });

  it("fetches with the detail key when both userId and id are present", async () => {
    mockGetHabit.mockResolvedValue(null);

    const { result } = renderHook(() => useHabit("u1", "h1"), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetHabit).toHaveBeenCalledWith("u1", "h1");
    expect(client.getQueryState(["habits", "detail", "u1", "h1"])).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Mutation hooks: each onSuccess carries `if (!userId) return;` and, for a real
// user, invalidates the habitKeys.all prefix. Cover both branches per hook.
// ---------------------------------------------------------------------------
const mutationHooks = [
  ["useSaveHabit", useSaveHabit, mockSaveHabit, { input: {} }],
  ["useArchiveHabit", useArchiveHabit, mockArchiveHabit, "h1"],
  ["useRestoreHabit", useRestoreHabit, mockRestoreHabit, "h1"],
  ["useToggleHabitLog", useToggleHabitLog, mockToggleHabitLog, { habitId: "h1", loggedOn: "d" }],
  [
    "useUpsertHabitLogNote",
    useUpsertHabitLogNote,
    mockUpsertHabitLogNote,
    { habitId: "h1", loggedOn: "d", note: "n" },
  ],
] as const;

describe.each(mutationHooks)("%s onSuccess guard", (_name, useHook, repoFn, variables) => {
  it("runs the mutation and invalidates the habits prefix for a real user", async () => {
    (repoFn as jest.Mock).mockResolvedValue({ id: "1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => (useHook as (u: string | null) => any)("u1"), {
      wrapper: makeWrapper(client),
    });

    await result.current.mutateAsync(variables as never);

    expect(repoFn).toHaveBeenCalled();
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(habitsAllKey);
  });

  it("skips invalidation when userId is null", async () => {
    (repoFn as jest.Mock).mockResolvedValue({ id: "1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => (useHook as (u: string | null) => any)(null), {
      wrapper: makeWrapper(client),
    });

    await result.current.mutateAsync(variables as never);

    expect(repoFn).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// `toggleHabitLog` is a read-then-write flip, so overlapping calls for one day
// race - both can read the same row and write in the same direction, which
// collapses two intended toggles into one.
// ---------------------------------------------------------------------------
describe("useToggleHabitLog in-flight guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function deferredToggle() {
    let settle: () => void = () => {};
    mockToggleHabitLog.mockImplementation(
      () =>
        new Promise((resolve) => {
          settle = () => resolve({ log: null, ticked: true });
        }),
    );
    return () => settle();
  }

  it("issues one request when the same day is pressed twice before the first settles", async () => {
    const settle = deferredToggle();
    const client = createTestQueryClient();
    const { result } = renderHook(() => useToggleHabitLog("u1"), { wrapper: makeWrapper(client) });

    // Both presses read the SAME hook snapshot on purpose: no re-render happens
    // between two synchronous taps, which is why `isPending` cannot guard this.
    act(() => {
      result.current.mutate({ habitId: "h1", loggedOn: "2026-08-09" });
      result.current.mutate({ habitId: "h1", loggedOn: "2026-08-09" });
    });

    await waitFor(() => expect(mockToggleHabitLog).toHaveBeenCalled());
    // An unguarded second call was dispatched in the same tick, so it would
    // have landed by now too.
    await act(async () => {});
    expect(mockToggleHabitLog).toHaveBeenCalledTimes(1);

    await act(async () => {
      settle();
    });
  });

  it("releases the key once the toggle settles, so the day can be toggled back", async () => {
    const settle = deferredToggle();
    const client = createTestQueryClient();
    const { result } = renderHook(() => useToggleHabitLog("u1"), { wrapper: makeWrapper(client) });

    act(() => result.current.mutate({ habitId: "h1", loggedOn: "2026-08-09" }));
    await waitFor(() => expect(mockToggleHabitLog).toHaveBeenCalledTimes(1));
    await act(async () => {
      settle();
    });

    const settleAgain = deferredToggle();
    act(() => result.current.mutate({ habitId: "h1", loggedOn: "2026-08-09" }));

    await waitFor(() => expect(mockToggleHabitLog).toHaveBeenCalledTimes(2));
    await act(async () => {
      settleAgain();
    });
  });

  it("does not block a different habit, so ticking a run of them stays concurrent", async () => {
    const settle = deferredToggle();
    const client = createTestQueryClient();
    const { result } = renderHook(() => useToggleHabitLog("u1"), { wrapper: makeWrapper(client) });

    act(() => {
      result.current.mutate({ habitId: "h1", loggedOn: "2026-08-09" });
      result.current.mutate({ habitId: "h2", loggedOn: "2026-08-09" });
    });

    await waitFor(() => expect(mockToggleHabitLog).toHaveBeenCalledTimes(2));

    await act(async () => {
      settle();
    });
  });
});

// ---------------------------------------------------------------------------
// useDeleteHabit delegates to useDeleteMutation(userId, deleteHabit, habitKeys.all).
// Exercise the real-user path: deleteFn called with (userId, id) and the
// habits prefix invalidated.
// ---------------------------------------------------------------------------
describe("useDeleteHabit", () => {
  it("calls deleteHabit with (userId, id) and invalidates the habits prefix", async () => {
    mockDeleteHabit.mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteHabit("u1"), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync("h1" as never);

    expect(mockDeleteHabit).toHaveBeenCalledWith("u1", "h1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(habitsAllKey);
  });
});
