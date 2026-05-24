import { act, renderHook } from "@testing-library/react-native";

import { useActivities } from "@/src/features/activities/queries";
import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useHierarchies } from "@/src/features/exposure/queries";
import { useGoals } from "@/src/features/goals/queries";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSelfCareLogs } from "@/src/features/self-care/queries";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useValuesProfile } from "@/src/features/values/queries";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { useCbtProgram } from "@/src/features/cbt/use-cbt-program";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/goals/queries", () => ({
  useGoals: jest.fn(),
}));

jest.mock("@/src/features/values/queries", () => ({
  useValuesProfile: jest.fn(),
}));

jest.mock("@/src/features/cbt/queries", () => ({
  useThoughtRecords: jest.fn(),
}));

jest.mock("@/src/features/beliefs/queries", () => ({
  useCoreBeliefs: jest.fn(),
}));

jest.mock("@/src/features/activities/queries", () => ({
  useActivities: jest.fn(),
}));

jest.mock("@/src/features/exposure/queries", () => ({
  useHierarchies: jest.fn(),
}));

jest.mock("@/src/features/mindfulness/queries", () => ({
  useMindfulnessSessions: jest.fn(),
}));

jest.mock("@/src/features/self-care/queries", () => ({
  useSelfCareLogs: jest.fn(),
}));

jest.mock("@/src/features/mood/queries", () => ({ useMoodLogs: jest.fn() }));

jest.mock("@/src/features/recovery/queries", () => ({
  useRecoveryPlan: jest.fn(),
}));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Typed mock references
// ---------------------------------------------------------------------------
const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;
const mockUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
const mockUseValuesProfile = useValuesProfile as jest.MockedFunction<typeof useValuesProfile>;
const mockUseThoughtRecords = useThoughtRecords as jest.MockedFunction<typeof useThoughtRecords>;
const mockUseCoreBeliefs = useCoreBeliefs as jest.MockedFunction<typeof useCoreBeliefs>;
const mockUseActivities = useActivities as jest.MockedFunction<typeof useActivities>;
const mockUseHierarchies = useHierarchies as jest.MockedFunction<typeof useHierarchies>;
const mockUseMindfulnessSessions = useMindfulnessSessions as jest.MockedFunction<
  typeof useMindfulnessSessions
>;
const mockUseSelfCareLogs = useSelfCareLogs as jest.MockedFunction<typeof useSelfCareLogs>;
const mockUseMoodLogs = useMoodLogs as jest.MockedFunction<typeof useMoodLogs>;
const mockUseRecoveryPlan = useRecoveryPlan as jest.MockedFunction<typeof useRecoveryPlan>;
const mockUseSelectedDate = useSelectedDate as jest.MockedFunction<typeof useSelectedDate>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const STARTED_AT = "2026-05-01T00:00:00.000Z";
const AFTER = "2026-05-02T00:00:00.000Z";
const TODAY = "2026-05-24";

const DAYS = ["2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05"];

/** Minimal data that satisfies every task signal, including distinct-day practices. */
const allCompleteData = {
  goals: [{ id: "g", createdAt: AFTER }],
  valuesProfile: {
    id: "v",
    userId: "user-1",
    personalValues: [{ key: "honest", tier: 1 as const }],
    priorityValues: ["honest"],
    updatedAt: AFTER,
  },
  moodLogs: DAYS.map((d, i) => ({
    id: `m${i}`,
    loggedAt: `${d}T08:00:00Z`,
    situation: "x",
    thoughts: "",
    behaviours: "",
    bodilySensations: "",
  })),
  thoughtRecords: [
    { id: "t1", createdAt: "2026-05-02T08:00:00Z", distortions: ["x"] },
    { id: "t2", createdAt: "2026-05-03T08:00:00Z", distortions: [] },
    { id: "t3", createdAt: "2026-05-04T08:00:00Z", distortions: [] },
  ],
  beliefs: [{ id: "b", createdAt: AFTER }],
  activities: DAYS.map((d, i) => ({
    id: `a${i}`,
    createdAt: `${d}T00:00:00Z`,
    completedAt: `${d}T18:00:00Z`,
  })),
  exposures: [{ id: "e", createdAt: AFTER }],
  selfCareLogs: [{ id: "sc", createdAt: AFTER }],
  mindfulnessSessions: DAYS.map((d, i) => ({ id: `s${i}`, completedAt: `${d}T19:00:00Z` })),
  recoveryPlan: { updatedAt: AFTER, personalSlogan: "Onward" },
};

function setupBaseMocks(mutateAsync: jest.Mock, isPending = false) {
  mockUseSelectedDate.mockReturnValue({ selectedDate: TODAY, isToday: true });

  mockUseUpdateUserPreferences.mockReturnValue({
    mutateAsync,
    isPending,
  } as unknown as ReturnType<typeof useUpdateUserPreferences>);

  mockUseGoals.mockReturnValue({
    data: allCompleteData.goals,
  } as unknown as ReturnType<typeof useGoals>);
  mockUseValuesProfile.mockReturnValue({
    data: allCompleteData.valuesProfile,
  } as unknown as ReturnType<typeof useValuesProfile>);
  mockUseThoughtRecords.mockReturnValue({
    data: allCompleteData.thoughtRecords,
  } as unknown as ReturnType<typeof useThoughtRecords>);
  mockUseCoreBeliefs.mockReturnValue({
    data: allCompleteData.beliefs,
  } as unknown as ReturnType<typeof useCoreBeliefs>);
  mockUseActivities.mockReturnValue({
    data: allCompleteData.activities,
  } as unknown as ReturnType<typeof useActivities>);
  mockUseHierarchies.mockReturnValue({
    data: allCompleteData.exposures,
  } as unknown as ReturnType<typeof useHierarchies>);
  mockUseMindfulnessSessions.mockReturnValue({
    data: allCompleteData.mindfulnessSessions,
  } as unknown as ReturnType<typeof useMindfulnessSessions>);
  mockUseSelfCareLogs.mockReturnValue({
    data: allCompleteData.selfCareLogs,
  } as unknown as ReturnType<typeof useSelfCareLogs>);
  mockUseMoodLogs.mockReturnValue({ data: allCompleteData.moodLogs } as unknown as ReturnType<
    typeof useMoodLogs
  >);
  mockUseRecoveryPlan.mockReturnValue({
    data: allCompleteData.recoveryPlan,
  } as unknown as ReturnType<typeof useRecoveryPlan>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("useCbtProgram — advancePhase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("advancePhase when not on last phase increments cbtProgramPhaseIndex and sets cbtProgramPhaseStartedAt", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync, false);

    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtProgramStartedAt: STARTED_AT,
        cbtProgramCompletedAt: null,
        cbtProgramPhaseIndex: 0,
        cbtProgramPhaseStartedAt: STARTED_AT,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    const { result } = renderHook(() => useCbtProgram("user-1"));

    act(() => result.current.advancePhase());

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        cbtProgramPhaseIndex: 1,
        cbtProgramPhaseStartedAt: expect.any(String),
      }),
    );
    // Should NOT set completedAt
    expect(mutateAsync).not.toHaveBeenCalledWith(
      expect.objectContaining({ cbtProgramCompletedAt: expect.any(String) }),
    );
  });

  it("advancePhase on the last phase sets cbtProgramCompletedAt instead of incrementing", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync, false);

    // Last phase index = totalPhases - 1 = 4 (CBT_PROGRAM has 5 entries)
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtProgramStartedAt: STARTED_AT,
        cbtProgramCompletedAt: null,
        cbtProgramPhaseIndex: 4,
        cbtProgramPhaseStartedAt: STARTED_AT,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    const { result } = renderHook(() => useCbtProgram("user-1"));

    act(() => result.current.advancePhase());

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        cbtProgramCompletedAt: expect.any(String),
      }),
    );
    expect(mutateAsync).not.toHaveBeenCalledWith(
      expect.objectContaining({ cbtProgramPhaseIndex: 5 }),
    );
  });

  it("startProgram sets cbtProgramPhaseIndex: 0 and cbtProgramPhaseStartedAt", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync, false);

    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtProgramPromptDismissedAt: "2026-05-22T09:00:00.000Z",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    const { result } = renderHook(() => useCbtProgram("user-1"));

    act(() => result.current.startProgram());

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        cbtOnboardingCompleted: true,
        cbtProgramCompletedAt: null,
        cbtProgramPromptDismissedAt: null,
        cbtProgramStartedAt: expect.any(String),
        cbtProgramPhaseIndex: 0,
        cbtProgramPhaseStartedAt: expect.any(String),
      }),
    );
  });

  it("replayProgram resets cbtProgramPhaseIndex to 0 and sets cbtProgramPhaseStartedAt", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync, false);

    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtProgramStartedAt: STARTED_AT,
        cbtProgramCompletedAt: "2026-05-10T00:00:00.000Z",
        cbtProgramPhaseIndex: 4,
        cbtProgramPhaseStartedAt: STARTED_AT,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    const { result } = renderHook(() => useCbtProgram("user-1"));

    act(() => result.current.replayProgram());

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        cbtProgramStartedAt: expect.any(String),
        cbtProgramCompletedAt: null,
        cbtProgramPromptDismissedAt: null,
        cbtProgramPhaseIndex: 0,
        cbtProgramPhaseStartedAt: expect.any(String),
      }),
    );
  });
});

describe("useCbtProgram — dismiss / show / abandon", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("dismisses and restores the start-program prompt", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync, false);

    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    const { result } = renderHook(() => useCbtProgram("user-1"));

    act(() => result.current.dismissProgramPrompt());
    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cbtProgramPromptDismissedAt: expect.any(String),
      }),
    );

    act(() => result.current.showProgramPrompt());
    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cbtProgramPromptDismissedAt: null,
      }),
    );
  });

  it("abandons the program and hides the start prompt", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync, false);

    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtProgramStartedAt: STARTED_AT,
        cbtProgramCompletedAt: "2026-05-10T00:00:00.000Z",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    const { result } = renderHook(() => useCbtProgram("user-1"));

    act(() => result.current.abandonProgram());

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        cbtProgramCompletedAt: null,
        cbtProgramPromptDismissedAt: expect.any(String),
        cbtProgramStartedAt: null,
      }),
    );
  });
});
