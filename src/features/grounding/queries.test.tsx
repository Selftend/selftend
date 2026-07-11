import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useGroundingSessionCount,
  useGroundingSessions,
  useSaveGroundingSession,
} from "@/src/features/grounding/queries";
import {
  countMindfulnessSessionsByNames,
  listMindfulnessSessionsByNames,
  saveMindfulnessSession,
} from "@/src/features/mindfulness/repository";
import { groundingSlugs } from "@/src/constants/grounding";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so list each explicitly as a jest.fn().
jest.mock("@/src/features/mindfulness/repository", () => ({
  countMindfulnessSessionsByNames: jest.fn(),
  listMindfulnessSessionsByNames: jest.fn(),
  saveMindfulnessSession: jest.fn(),
}));

const mockList = listMindfulnessSessionsByNames as jest.MockedFunction<
  typeof listMindfulnessSessionsByNames
>;
const mockCount = countMindfulnessSessionsByNames as jest.MockedFunction<
  typeof countMindfulnessSessionsByNames
>;
const mockSave = saveMindfulnessSession as jest.MockedFunction<typeof saveMindfulnessSession>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  client = createTestQueryClient();
  // Benign defaults so queryFn/mutationFn never throw; individual tests override.
  mockList.mockResolvedValue([]);
  mockCount.mockResolvedValue(0);
  mockSave.mockResolvedValue(undefined as never);
});

describe("useGroundingSessions", () => {
  it("filters by grounding slugs at the query level so the limit applies after the filter", async () => {
    // Regression guard: passing the slugs to the repository means the DB filters by
    // exercise type BEFORE applying the row limit, so grounding sessions can't be hidden
    // behind a window full of other mindfulness types.
    mockList.mockResolvedValue([{ id: "1", exerciseName: groundingSlugs[0] } as never]);

    const { result } = renderHook(() => useGroundingSessions("user-1", 30), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith("user-1", [...groundingSlugs], 30);
    expect(result.current.data).toEqual([{ id: "1", exerciseName: groundingSlugs[0] }]);
  });

  it("passes a custom limit through to the repository", async () => {
    const { result } = renderHook(() => useGroundingSessions("user-1", 5), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith("user-1", [...groundingSlugs], 5);
  });

  it("does not fetch when userId is null (query disabled)", () => {
    renderHook(() => useGroundingSessions(null), { wrapper: makeWrapper(client) });
    expect(mockList).not.toHaveBeenCalled();
  });
});

describe("useGroundingSessionCount", () => {
  it("fetches the grounding count for a real user", async () => {
    mockCount.mockResolvedValue(7);

    const { result } = renderHook(() => useGroundingSessionCount("user-1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCount).toHaveBeenCalledWith("user-1", [...groundingSlugs]);
    expect(result.current.data).toBe(7);
  });

  it("does not fetch when userId is null (query disabled)", () => {
    renderHook(() => useGroundingSessionCount(null), { wrapper: makeWrapper(client) });
    expect(mockCount).not.toHaveBeenCalled();
  });
});

describe("useSaveGroundingSession", () => {
  it("saves and invalidates breathing, grounding, and mindfulness for a real user", async () => {
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveGroundingSession("user-1"), {
      wrapper: makeWrapper(client),
    });

    const input = { exerciseName: groundingSlugs[0], durationSeconds: 60 };
    await result.current.mutateAsync(input as never);

    expect(mockSave).toHaveBeenCalledWith("user-1", input);
    // Shared mindfulness_sessions table: all three prefixes must be refreshed.
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["breathing"]);
    expect(queryKeys).toContainEqual(["grounding"]);
    expect(queryKeys).toContainEqual(["mindfulness"]);
  });

  it("skips invalidation when userId is null (onSuccess guard short-circuits)", async () => {
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveGroundingSession(null), {
      wrapper: makeWrapper(client),
    });

    await result.current.mutateAsync({ exerciseName: groundingSlugs[0] } as never);

    // mutationFn still runs (saveMindfulnessSession is called), but the guard
    // returns before any invalidateQueries call.
    expect(mockSave).toHaveBeenCalledWith(null, { exerciseName: groundingSlugs[0] });
    expect(spy).not.toHaveBeenCalled();
  });
});
