import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useBreathingSessionCount,
  useBreathingSessions,
  useSaveBreathingSession,
} from "@/src/features/breathing/queries";
import {
  countMindfulnessSessionsExcludingNames,
  listMindfulnessSessionsByNames,
  saveMindfulnessSession,
} from "@/src/features/mindfulness/repository";
import { breathingSlugs } from "@/src/constants/breathing";
import { groundingSlugs } from "@/src/constants/grounding";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/mindfulness/repository", () => ({
  countMindfulnessSessionsExcludingNames: jest.fn(),
  listMindfulnessSessionsByNames: jest.fn(),
  saveMindfulnessSession: jest.fn(),
}));

const mockCountExcluding = countMindfulnessSessionsExcludingNames as jest.MockedFunction<
  typeof countMindfulnessSessionsExcludingNames
>;
const mockList = listMindfulnessSessionsByNames as jest.MockedFunction<
  typeof listMindfulnessSessionsByNames
>;
const mockSave = saveMindfulnessSession as jest.MockedFunction<typeof saveMindfulnessSession>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useBreathingSessions", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("filters by breathing slugs at the query level so the limit applies after the filter", async () => {
    // Regression guard: passing the slugs to the repository means the DB filters by
    // exercise type BEFORE applying the row limit, so breathing sessions can't be hidden
    // behind a window full of other mindfulness types.
    mockList.mockResolvedValue([{ id: "1", exerciseName: breathingSlugs[0] } as never]);

    const { result } = renderHook(() => useBreathingSessions("user-1", 30, ["e-1"]), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith("user-1", [...breathingSlugs, "e-1"], 30);
    expect(result.current.data).toEqual([{ id: "1", exerciseName: breathingSlugs[0] }]);
  });

  it("does not fetch when userId is null (query disabled)", () => {
    renderHook(() => useBreathingSessions(null), { wrapper: makeWrapper(client) });
    expect(mockList).not.toHaveBeenCalled();
  });
});

describe("useBreathingSessionCount", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("counts by excluding grounding, so custom-exercise sessions are included", async () => {
    // A custom exercise's sessions carry that exercise's id as their name, not a
    // breathingSlugs value, so counting by inclusion would report "No sessions yet"
    // for a custom-only history (PR #452 review). The complement of the closed
    // grounding set is the whole open breathing set - built-ins and customs alike,
    // exactly how routines/derive.ts classifies the shared table.
    mockCountExcluding.mockResolvedValue(3);

    const { result } = renderHook(() => useBreathingSessionCount("user-1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCountExcluding).toHaveBeenCalledWith("user-1", [...groundingSlugs]);
    expect(result.current.data).toBe(3);
  });

  it("does not fetch when userId is null (query disabled)", () => {
    renderHook(() => useBreathingSessionCount(null), { wrapper: makeWrapper(client) });
    expect(mockCountExcluding).not.toHaveBeenCalled();
  });
});

describe("useSaveBreathingSession", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("saves and invalidates every mindfulness-table view for a real user", async () => {
    // A breathing save lands in mindfulness_sessions, which also backs the grounding and
    // mindfulness views, so onSuccess must refresh all three namespaces, not just breathing.
    mockSave.mockResolvedValue({ id: "s-1" } as never);
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSaveBreathingSession("user-1"), {
      wrapper: makeWrapper(client),
    });

    const input = { exerciseName: breathingSlugs[0], durationSeconds: 60 };
    await result.current.mutateAsync(input as never);

    expect(mockSave).toHaveBeenCalledWith("user-1", input);
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["breathing"]);
    expect(queryKeys).toContainEqual(["grounding"]);
    expect(queryKeys).toContainEqual(["mindfulness"]);
  });

  it("skips invalidation when userId is null (onSuccess guard short-circuits)", async () => {
    mockSave.mockResolvedValue({ id: "s-1" } as never);
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSaveBreathingSession(null), {
      wrapper: makeWrapper(client),
    });

    await result.current.mutateAsync({ exerciseName: breathingSlugs[0] } as never);

    // mutationFn still runs (repo called), but the `if (!userId) return` guard prevents any
    // cache invalidation from firing.
    expect(mockSave).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});
