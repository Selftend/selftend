import { renderHook } from "@testing-library/react-native";

import {
  useAllActionSteps,
  useBullsEyeSnapshots,
  useChoicePoints,
  useCommittedActions,
  useConnectionLogs,
  useDefusionLogs,
  useExpansionLogs,
  useObservingSelfSessions,
  useUrgeSurfLogs,
  useValueEntries,
} from "@/src/features/act/queries";
import { useActEntryCountSince } from "@/src/features/act/count-queries";

jest.mock("@/src/features/act/queries", () => ({
  useAllActionSteps: jest.fn(),
  useBullsEyeSnapshots: jest.fn(),
  useChoicePoints: jest.fn(),
  useCommittedActions: jest.fn(),
  useConnectionLogs: jest.fn(),
  useDefusionLogs: jest.fn(),
  useExpansionLogs: jest.fn(),
  useObservingSelfSessions: jest.fn(),
  useUrgeSurfLogs: jest.fn(),
  useValueEntries: jest.fn(),
}));

const actQueryMocks = [
  useAllActionSteps,
  useBullsEyeSnapshots,
  useChoicePoints,
  useCommittedActions,
  useConnectionLogs,
  useDefusionLogs,
  useExpansionLogs,
  useObservingSelfSessions,
  useUrgeSurfLogs,
  useValueEntries,
] as jest.MockedFunction<typeof useChoicePoints>[];

// Every list hook starts empty and not-loading; individual tests override what they need.
function setupBaseMocks() {
  for (const queryMock of actQueryMocks) {
    queryMock.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useChoicePoints>);
  }
}

const SINCE = "2026-06-08T00:00:00.000Z"; // 30 days before "now" in these tests
const BEFORE_CUTOFF = "2026-06-01T00:00:00.000Z";
const AFTER_CUTOFF = "2026-06-15T00:00:00.000Z";

describe("useActEntryCountSince", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupBaseMocks();
  });

  it("sums entries created since the cutoff across every ACT entry list", () => {
    (useChoicePoints as jest.MockedFunction<typeof useChoicePoints>).mockReturnValue({
      data: [{ createdAt: AFTER_CUTOFF }, { createdAt: BEFORE_CUTOFF }],
      isLoading: false,
    } as unknown as ReturnType<typeof useChoicePoints>);
    (useDefusionLogs as jest.MockedFunction<typeof useDefusionLogs>).mockReturnValue({
      data: [{ createdAt: AFTER_CUTOFF }],
      isLoading: false,
    } as unknown as ReturnType<typeof useDefusionLogs>);
    (useCommittedActions as jest.MockedFunction<typeof useCommittedActions>).mockReturnValue({
      data: [{ createdAt: AFTER_CUTOFF }, { createdAt: AFTER_CUTOFF }],
      isLoading: false,
    } as unknown as ReturnType<typeof useCommittedActions>);

    const { result } = renderHook(() => useActEntryCountSince("user-1", SINCE));

    // 1 (choicePoints, after cutoff only) + 1 (defusion) + 2 (committedActions) = 4
    expect(result.current.data).toBe(4);
    expect(result.current.isLoading).toBe(false);
  });

  it("is loading while any underlying list is still loading", () => {
    (useValueEntries as jest.MockedFunction<typeof useValueEntries>).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useValueEntries>);

    const { result } = renderHook(() => useActEntryCountSince("user-1", SINCE));

    expect(result.current.isLoading).toBe(true);
  });

  it("returns zero when every list is empty", () => {
    const { result } = renderHook(() => useActEntryCountSince("user-1", SINCE));

    expect(result.current.data).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it("requests a high row limit from the list hooks that accept one, so a busy 30-day window isn't capped at 30", () => {
    renderHook(() => useActEntryCountSince("user-1", SINCE));

    // The six list hooks with a `limit` param are asked for 500 rows (not the default 30).
    for (const hook of [
      useChoicePoints,
      useDefusionLogs,
      useExpansionLogs,
      useUrgeSurfLogs,
      useConnectionLogs,
      useObservingSelfSessions,
    ] as jest.MockedFunction<typeof useChoicePoints>[]) {
      expect(hook).toHaveBeenCalledWith("user-1", 500);
    }
  });
});
