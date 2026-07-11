import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useMeditationProgramState,
  useMeditationSession,
  useMeditationSessionCount,
  useMeditationSessions,
  useSaveMeditationSession,
  useSaveStagePracticeNote,
  useStagePracticeNotes,
  useUpsertMeditationProgramState,
} from "@/src/features/meditation/queries";
import * as repo from "@/src/features/meditation/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern already
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/meditation/repository", () => ({
  countMeditationSessions: jest.fn(),
  getMeditationProgramState: jest.fn(),
  getMeditationSession: jest.fn(),
  listMeditationSessions: jest.fn(),
  listStagePracticeNotes: jest.fn(),
  saveMeditationSession: jest.fn(),
  saveStagePracticeNote: jest.fn(),
  upsertMeditationProgramState: jest.fn(),
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
// Single-id list/state queries: enabled = Boolean(userId). Cover both branches:
// null user (queryFn never runs) and a real user (queryFn runs).
// ---------------------------------------------------------------------------
const listHooks = [
  ["useMeditationSessions", useMeditationSessions, repo.listMeditationSessions],
  ["useMeditationSessionCount", useMeditationSessionCount, repo.countMeditationSessions],
  ["useMeditationProgramState", useMeditationProgramState, repo.getMeditationProgramState],
  ["useStagePracticeNotes", useStagePracticeNotes, repo.listStagePracticeNotes],
] as const;

describe.each(listHooks)("%s enabled gate", (_name, useHook, repoFn) => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null) => unknown)(null), { wrapper: wrap(client) });
    expect(repoFn).not.toHaveBeenCalled();
  });

  it("fetches when userId is present", async () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null) => unknown)("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repoFn).toHaveBeenCalled());
  });
});

// The default limit flows into the repository call and the cache key.
describe("useMeditationSessions limit passthrough", () => {
  it("forwards the caller's limit to the repository", async () => {
    const client = createTestQueryClient();
    renderHook(() => useMeditationSessions("u1", 100), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.listMeditationSessions).toHaveBeenCalledWith("u1", 100));
  });

  it("defaults to a limit of 30 when omitted", async () => {
    const client = createTestQueryClient();
    renderHook(() => useMeditationSessions("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.listMeditationSessions).toHaveBeenCalledWith("u1", 30));
  });
});

// The optional stage arg flows into the repository call.
describe("useStagePracticeNotes stage passthrough", () => {
  it("forwards the stage to the repository when provided", async () => {
    const client = createTestQueryClient();
    renderHook(() => useStagePracticeNotes("u1", 4), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.listStagePracticeNotes).toHaveBeenCalledWith("u1", 4));
  });

  it("passes undefined stage when omitted", async () => {
    const client = createTestQueryClient();
    renderHook(() => useStagePracticeNotes("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.listStagePracticeNotes).toHaveBeenCalledWith("u1", undefined));
  });
});

// ---------------------------------------------------------------------------
// Detail query: enabled = Boolean(userId) && Boolean(sessionId). Cover all
// three branches: userId missing, sessionId missing, both present.
// ---------------------------------------------------------------------------
describe("useMeditationSession enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useMeditationSession(null, "s1"), { wrapper: wrap(client) });
    expect(repo.getMeditationSession).not.toHaveBeenCalled();
  });

  it("does not fetch when sessionId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useMeditationSession("u1", null), { wrapper: wrap(client) });
    expect(repo.getMeditationSession).not.toHaveBeenCalled();
  });

  it("fetches when both userId and sessionId are present", async () => {
    const client = createTestQueryClient();
    renderHook(() => useMeditationSession("u1", "s1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.getMeditationSession).toHaveBeenCalledWith("u1", "s1"));
  });
});

// ---------------------------------------------------------------------------
// useSaveMeditationSession: onSuccess guard `if (!userId) return;`. Real user
// runs mutationFn and invalidates the list + program-state keys; null user
// short-circuits before any invalidation.
// ---------------------------------------------------------------------------
describe("useSaveMeditationSession onSuccess guard", () => {
  it("invalidates the list and program-state keys for a real user", async () => {
    (repo.saveMeditationSession as jest.Mock).mockResolvedValue({ id: "m1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveMeditationSession("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({} as never);

    expect(repo.saveMeditationSession).toHaveBeenCalledWith("u1", {});
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["meditation", "list", "u1"]);
    expect(queryKeys).toContainEqual(["meditation", "programState", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.saveMeditationSession as jest.Mock).mockResolvedValue({ id: "m1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveMeditationSession(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({} as never);

    expect(repo.saveMeditationSession).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useUpsertMeditationProgramState: onSuccess guard + single program-state
// invalidation.
// ---------------------------------------------------------------------------
describe("useUpsertMeditationProgramState onSuccess guard", () => {
  it("invalidates the program-state key for a real user", async () => {
    (repo.upsertMeditationProgramState as jest.Mock).mockResolvedValue({ userId: "u1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpsertMeditationProgramState("u1"), {
      wrapper: wrap(client),
    });

    await result.current.mutateAsync({ currentStage: 3 } as never);

    expect(repo.upsertMeditationProgramState).toHaveBeenCalledWith("u1", { currentStage: 3 });
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["meditation", "programState", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.upsertMeditationProgramState as jest.Mock).mockResolvedValue({ userId: "u1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpsertMeditationProgramState(null), {
      wrapper: wrap(client),
    });

    await result.current.mutateAsync({ currentStage: 3 } as never);

    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useSaveStagePracticeNote: onSuccess guard + stage-scoped and all-notes
// invalidation, both keyed off the mutation variables' stage.
// ---------------------------------------------------------------------------
describe("useSaveStagePracticeNote onSuccess guard", () => {
  it("invalidates the stage-scoped and all-notes keys for a real user", async () => {
    (repo.saveStagePracticeNote as jest.Mock).mockResolvedValue({ id: "n1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveStagePracticeNote("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ stage: 5, note: "focus" } as never);

    expect(repo.saveStagePracticeNote).toHaveBeenCalledWith("u1", 5, "focus");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["meditation", "notes", "u1", 5]);
    expect(queryKeys).toContainEqual(["meditation", "notes", "u1", "all"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.saveStagePracticeNote as jest.Mock).mockResolvedValue({ id: "n1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveStagePracticeNote(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ stage: 5, note: "focus" } as never);

    expect(spy).not.toHaveBeenCalled();
  });
});
