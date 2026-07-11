import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useBreathingSessions, useSaveBreathingSession } from "@/src/features/breathing/queries";
import {
  listMindfulnessSessionsByNames,
  saveMindfulnessSession,
} from "@/src/features/mindfulness/repository";
import { breathingSlugs } from "@/src/constants/breathing";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/mindfulness/repository", () => ({
  listMindfulnessSessionsByNames: jest.fn(),
  saveMindfulnessSession: jest.fn(),
}));

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
