import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useActivities } from "@/src/features/activities/queries";
import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useHierarchies } from "@/src/features/exposure/queries";
import { useGoals } from "@/src/features/goals/queries";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useTasks } from "@/src/features/procrastination/queries";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSelfCareLogs } from "@/src/features/self-care/queries";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useValuesProfile } from "@/src/features/values/queries";
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

jest.mock("@/src/features/procrastination/queries", () => ({
  useTasks: jest.fn(),
}));

jest.mock("@/src/features/mindfulness/queries", () => ({
  useMindfulnessSessions: jest.fn(),
}));

jest.mock("@/src/features/self-care/queries", () => ({
  useSelfCareLogs: jest.fn(),
}));

jest.mock("@/src/features/mood/queries", () => ({
  useMoodLogs: jest.fn(),
}));

jest.mock("@/src/features/recovery/queries", () => ({
  useRecoveryPlan: jest.fn(),
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
const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
const mockUseMindfulnessSessions = useMindfulnessSessions as jest.MockedFunction<
  typeof useMindfulnessSessions
>;
const mockUseSelfCareLogs = useSelfCareLogs as jest.MockedFunction<typeof useSelfCareLogs>;
const mockUseMoodLogs = useMoodLogs as jest.MockedFunction<typeof useMoodLogs>;
const mockUseRecoveryPlan = useRecoveryPlan as jest.MockedFunction<typeof useRecoveryPlan>;

// ---------------------------------------------------------------------------
// Fixtures — mirrors "graduates when all weeks complete" in derive-program.test.ts
// ---------------------------------------------------------------------------
const STARTED_AT = "2026-05-01T00:00:00.000Z";
const AFTER = "2026-05-02T00:00:00.000Z";

const DAYS = ["2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05"];

/** Minimal data that satisfies every task signal, including distinct-day practices. */
const allCompleteData = {
  // Week 1 — foundation: a goal, values, and mood check-in on 4 distinct days.
  goals: [{ id: "g", createdAt: AFTER }],
  valuesProfile: {
    id: "v",
    userId: "user-1",
    personalValues: [{ key: "honest", tier: 1 as const }],
    updatedAt: AFTER,
  },
  moodLogs: DAYS.map((d, i) => ({ id: `m${i}`, loggedAt: `${d}T08:00:00Z` })),
  // Week 2 — think: thought records on 3 distinct days + a belief.
  thoughtRecords: [
    { id: "t1", createdAt: "2026-05-02T08:00:00Z", distortions: ["x"] },
    { id: "t2", createdAt: "2026-05-03T08:00:00Z", distortions: [] },
    { id: "t3", createdAt: "2026-05-04T08:00:00Z", distortions: [] },
  ],
  beliefs: [{ id: "b", createdAt: AFTER }],
  // Week 3 — act: a completed activity on 4 distinct days + an exposure.
  activities: DAYS.map((d, i) => ({
    id: `a${i}`,
    createdAt: `${d}T00:00:00Z`,
    completedAt: `${d}T18:00:00Z`,
  })),
  exposures: [{ id: "e", createdAt: AFTER }],
  // Week 4 — be: a calming session on 4 distinct days + a resilience plan.
  selfCareLogs: [{ id: "sc", createdAt: AFTER }],
  mindfulnessSessions: DAYS.map((d, i) => ({ id: `s${i}`, completedAt: `${d}T19:00:00Z` })),
  recoveryPlan: { updatedAt: AFTER, personalSlogan: "Onward" },
};

function setupBaseMocks(mutateAsync: jest.Mock, isPending = false) {
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
  mockUseTasks.mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useTasks>);
  mockUseMindfulnessSessions.mockReturnValue({
    data: allCompleteData.mindfulnessSessions,
  } as unknown as ReturnType<typeof useMindfulnessSessions>);
  mockUseSelfCareLogs.mockReturnValue({
    data: allCompleteData.selfCareLogs,
  } as unknown as ReturnType<typeof useSelfCareLogs>);
  mockUseMoodLogs.mockReturnValue({
    data: allCompleteData.moodLogs,
  } as unknown as ReturnType<typeof useMoodLogs>);
  mockUseRecoveryPlan.mockReturnValue({
    data: allCompleteData.recoveryPlan,
  } as unknown as ReturnType<typeof useRecoveryPlan>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("useCbtProgram — graduation latch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fires mutateAsync exactly once when all weeks are complete and the program is in progress", async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync, false);

    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtProgramStartedAt: STARTED_AT,
        cbtProgramCompletedAt: null,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderHook(() => useCbtProgram("user-1"));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
  });

  it("does NOT fire mutateAsync when updatePreferences.isPending is true (in-flight guard)", async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync, true /* isPending */);

    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtProgramStartedAt: STARTED_AT,
        cbtProgramCompletedAt: null,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderHook(() => useCbtProgram("user-1"));

    // Give effects a chance to flush; none should fire
    await new Promise((r) => setTimeout(r, 50));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("does NOT fire mutateAsync when cbtProgramCompletedAt is already set (already-complete guard)", async () => {
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

    renderHook(() => useCbtProgram("user-1"));

    await new Promise((r) => setTimeout(r, 50));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("starts the program and clears any dismissed prompt state", () => {
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
      }),
    );
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
