import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useDeleteMoodLog,
  useFirstMoodLogDate,
  useMoodHistory,
  useMoodLog,
  useMoodLogCount,
  useMoodLogs,
  useMoodScorePoints,
  useSaveMoodLog,
} from "@/src/features/mood/queries";
import * as repo from "@/src/features/mood/repository";
import { useReminderPromptStore } from "@/src/stores/reminder-prompt-store";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern already
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/mood/repository", () => ({
  countMoodLogs: jest.fn(),
  deleteMoodLog: jest.fn(),
  getFirstMoodLogDate: jest.fn(),
  getMoodLog: jest.fn(),
  listMoodLogs: jest.fn(),
  listMoodScorePoints: jest.fn(),
  saveMoodLog: jest.fn(),
}));

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Every repo fn resolves to a benign value so queryFn/mutationFn don't throw.
  (repo.countMoodLogs as jest.Mock).mockResolvedValue(0);
  (repo.deleteMoodLog as jest.Mock).mockResolvedValue(undefined);
  (repo.getMoodLog as jest.Mock).mockResolvedValue(null);
  (repo.getFirstMoodLogDate as jest.Mock).mockResolvedValue(null);
  (repo.listMoodLogs as jest.Mock).mockResolvedValue([]);
  (repo.listMoodScorePoints as jest.Mock).mockResolvedValue([]);
  (repo.saveMoodLog as jest.Mock).mockResolvedValue({ id: "m1" });
});

// ---------------------------------------------------------------------------
// Single-id list/count query hooks: enabled = Boolean(userId). Cover the null
// branch (queryFn never runs) and the real-user branch (queryFn runs).
// ---------------------------------------------------------------------------
const listHooks = [
  ["useMoodLogs", useMoodLogs, repo.listMoodLogs],
  ["useMoodLogCount", useMoodLogCount, repo.countMoodLogs],
] as const;

describe.each(listHooks)("%s enabled gate", (_name, useHook, repoFn) => {
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

describe("useMoodLogs query", () => {
  it("passes the user id and limit through to the repository", async () => {
    const client = createTestQueryClient();
    renderHook(() => useMoodLogs("u1", 15), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.listMoodLogs).toHaveBeenCalledWith("u1", 15));
  });
});

// ---------------------------------------------------------------------------
// useMoodHistory: enabled gate + a `select` ternary that either returns the
// full window or slices to `take`. Exercise BOTH ternary branches by asserting
// the shape of the returned (selected) data.
// ---------------------------------------------------------------------------
describe("useMoodHistory", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useMoodHistory(null), { wrapper: wrap(client) });
    expect(repo.listMoodLogs).not.toHaveBeenCalled();
  });

  it("always fetches the full 200-row window regardless of take", async () => {
    const client = createTestQueryClient();
    renderHook(() => useMoodHistory("u1", 5), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.listMoodLogs).toHaveBeenCalledWith("u1", 200));
  });

  it("returns the full window when take >= the window size (default take)", async () => {
    const rows = Array.from({ length: 4 }, (_, i) => ({ id: `r${i}` }));
    (repo.listMoodLogs as jest.Mock).mockResolvedValue(rows);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useMoodHistory("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(result.current.data).toEqual(rows));
  });

  it("slices to the newest `take` rows when take < the window size", async () => {
    const rows = Array.from({ length: 4 }, (_, i) => ({ id: `r${i}` }));
    (repo.listMoodLogs as jest.Mock).mockResolvedValue(rows);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useMoodHistory("u1", 2), { wrapper: wrap(client) });
    await waitFor(() => expect(result.current.data).toEqual(rows.slice(0, 2)));
  });
});

// ---------------------------------------------------------------------------
// useMoodScorePoints / useFirstMoodLogDate: the trend's narrow window query and
// its custom-range lower clamp. Both live under the "mood" root key so a save
// invalidates them alongside the history cache.
// ---------------------------------------------------------------------------
describe("useMoodScorePoints", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useMoodScorePoints(null, "2026-07-01T00:00:00.000Z"), {
      wrapper: wrap(client),
    });
    expect(repo.listMoodScorePoints).not.toHaveBeenCalled();
  });

  it("passes the window bounds through to the repository", async () => {
    const client = createTestQueryClient();
    renderHook(
      () => useMoodScorePoints("u1", "2026-03-03T00:00:00.000Z", "2026-04-01T23:59:59.999Z"),
      { wrapper: wrap(client) },
    );
    await waitFor(() =>
      expect(repo.listMoodScorePoints).toHaveBeenCalledWith(
        "u1",
        "2026-03-03T00:00:00.000Z",
        "2026-04-01T23:59:59.999Z",
      ),
    );
  });

  it("caches under the mood root key so saves invalidate it", async () => {
    const client = createTestQueryClient();
    renderHook(() => useMoodScorePoints("u1", "2026-07-01T00:00:00.000Z"), {
      wrapper: wrap(client),
    });
    await waitFor(() => expect(repo.listMoodScorePoints).toHaveBeenCalled());
    expect(client.getQueryCache().findAll({ queryKey: ["mood"] }).length).toBeGreaterThan(0);
  });
});

describe("useFirstMoodLogDate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useFirstMoodLogDate(null), { wrapper: wrap(client) });
    expect(repo.getFirstMoodLogDate).not.toHaveBeenCalled();
  });

  it("fetches the first log date for a real user", async () => {
    (repo.getFirstMoodLogDate as jest.Mock).mockResolvedValue("2026-01-05T10:00:00.000Z");
    const client = createTestQueryClient();
    const { result } = renderHook(() => useFirstMoodLogDate("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(result.current.data).toBe("2026-01-05T10:00:00.000Z"));
    expect(repo.getFirstMoodLogDate).toHaveBeenCalledWith("u1");
  });
});

// ---------------------------------------------------------------------------
// useMoodLog: enabled = Boolean(userId && id). Cover all three `&&` states:
// userId missing, id missing, and both present.
// ---------------------------------------------------------------------------
describe("useMoodLog enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useMoodLog(null, "x1"), { wrapper: wrap(client) });
    expect(repo.getMoodLog).not.toHaveBeenCalled();
  });

  it("does not fetch when the id is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useMoodLog("u1", null), { wrapper: wrap(client) });
    expect(repo.getMoodLog).not.toHaveBeenCalled();
  });

  it("fetches with (userId, id) when both are present", async () => {
    const client = createTestQueryClient();
    renderHook(() => useMoodLog("u1", "x1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.getMoodLog).toHaveBeenCalledWith("u1", "x1"));
  });
});

// ---------------------------------------------------------------------------
// useDeleteMoodLog: thin wrapper over useDeleteMutation. Driving the real-user
// path asserts the delete fn receives (userId, id).
// ---------------------------------------------------------------------------
describe("useDeleteMoodLog", () => {
  it("runs the delete for a real user with (userId, id)", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteMoodLog("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync("log-1");

    expect(repo.deleteMoodLog).toHaveBeenCalledWith("u1", "log-1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["mood"]);
  });

  it("skips invalidation when userId is null", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteMoodLog(null), { wrapper: wrap(client) });

    await result.current.mutateAsync("log-1");

    expect(repo.deleteMoodLog).toHaveBeenCalledWith(null, "log-1");
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useSaveMoodLog: onSuccess guard `if (!userId) return;`. Cover both branches:
// real user (mutationFn + invalidate of moodKeys.all) and null user (no
// invalidation).
// ---------------------------------------------------------------------------
describe("useSaveMoodLog onSuccess guard", () => {
  it("saves and invalidates the mood root key for a real user", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveMoodLog("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: { moodScore: 3 } as never });

    expect(repo.saveMoodLog).toHaveBeenCalledWith("u1", { moodScore: 3 }, undefined);
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["mood"]);
  });

  it("forwards an explicit moodLogId to the repository", async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveMoodLog("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: { moodScore: 3 } as never, moodLogId: "edit-1" });

    expect(repo.saveMoodLog).toHaveBeenCalledWith("u1", { moodScore: 3 }, "edit-1");
  });

  it("skips invalidation when userId is null", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveMoodLog(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: { moodScore: 3 } as never });

    expect(repo.saveMoodLog).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Contextual reminder prompt wiring: a NEW mood log requests the one-time
// prompt; editing an existing log does not.
// ---------------------------------------------------------------------------
describe("useSaveMoodLog reminder prompt wiring", () => {
  beforeEach(() => {
    useReminderPromptStore.getState().dismissReminderPrompt();
  });

  it("requests the mood reminder prompt after creating a log", async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveMoodLog("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: { moodScore: 3 } as never });

    expect(useReminderPromptStore.getState().request).toMatchObject({ targetKey: "mood" });
  });

  it("does not request the prompt when editing an existing log", async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveMoodLog("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: { moodScore: 3 } as never, moodLogId: "edit-1" });

    expect(useReminderPromptStore.getState().request).toBeNull();
  });
});
