import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useBreathingSessionCount,
  useBreathingSessionPages,
  useBreathingSessions,
  useBreathingTotalMinutes,
  useSaveBreathingSession,
} from "@/src/features/breathing/queries";
import {
  countMindfulnessSessionsExcludingNames,
  listMindfulnessSessionsByNames,
  listMindfulnessSessionsExcludingNamesPage,
  saveMindfulnessSession,
  sumMindfulnessMinutesExcludingNames,
} from "@/src/features/mindfulness/repository";
import { breathingSlugs } from "@/src/constants/breathing";
import { groundingSlugs } from "@/src/constants/grounding";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/mindfulness/repository", () => ({
  countMindfulnessSessionsExcludingNames: jest.fn(),
  listMindfulnessSessionsByNames: jest.fn(),
  listMindfulnessSessionsExcludingNamesPage: jest.fn(),
  saveMindfulnessSession: jest.fn(),
  sumMindfulnessMinutesExcludingNames: jest.fn(),
}));

const mockCountExcluding = countMindfulnessSessionsExcludingNames as jest.MockedFunction<
  typeof countMindfulnessSessionsExcludingNames
>;
const mockList = listMindfulnessSessionsByNames as jest.MockedFunction<
  typeof listMindfulnessSessionsByNames
>;
const mockSave = saveMindfulnessSession as jest.MockedFunction<typeof saveMindfulnessSession>;
const mockListExcludingPage = listMindfulnessSessionsExcludingNamesPage as jest.MockedFunction<
  typeof listMindfulnessSessionsExcludingNamesPage
>;
const mockSumExcluding = sumMindfulnessMinutesExcludingNames as jest.MockedFunction<
  typeof sumMindfulnessMinutesExcludingNames
>;

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

describe("useBreathingSessionPages", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("pages by excluding grounding, so a deleted pattern's sessions still appear", async () => {
    // The all-sessions screen promises the complete record. A custom pattern's
    // sessions carry that pattern's uuid as their name and OUTLIVE the pattern,
    // so filtering by the patterns that still exist would silently drop the
    // history of every deleted one - while the overview's count and minutes,
    // which count by exclusion, went on including them. The two would disagree
    // and this screen would be the one lying.
    mockListExcludingPage.mockResolvedValue([{ id: "1" } as never]);

    const { result } = renderHook(() => useBreathingSessionPages("user-1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListExcludingPage).toHaveBeenCalledWith("user-1", [...groundingSlugs], 20, 0);
    // Never an inclusion list built from the surviving patterns.
    expect(mockList).not.toHaveBeenCalled();
  });

  it("asks for one more page only while the last one came back full", async () => {
    // A short page is the end of the data; a full one may or may not be.
    mockListExcludingPage.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ id: `${i}` })) as never,
    );

    const { result } = renderHook(() => useBreathingSessionPages("user-1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("does not fetch when userId is null (query disabled)", () => {
    renderHook(() => useBreathingSessionPages(null), { wrapper: makeWrapper(client) });
    expect(mockListExcludingPage).not.toHaveBeenCalled();
  });
});

describe("useBreathingTotalMinutes", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("sums lifetime minutes server-side, by the same exclusion the count uses", async () => {
    // Reducing the screen's own 50-row list would turn a lifetime figure into a
    // "last 50 sessions" one with nothing in the label saying so.
    mockSumExcluding.mockResolvedValue(21);

    const { result } = renderHook(() => useBreathingTotalMinutes("user-1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSumExcluding).toHaveBeenCalledWith([...groundingSlugs]);
    expect(result.current.data).toBe(21);
  });

  it("does not fetch when userId is null (query disabled)", () => {
    renderHook(() => useBreathingTotalMinutes(null), { wrapper: makeWrapper(client) });
    expect(mockSumExcluding).not.toHaveBeenCalled();
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
