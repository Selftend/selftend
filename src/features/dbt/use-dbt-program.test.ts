import { act, renderHook } from "@testing-library/react-native";

import {
  useCopingPlan,
  useDbtSessions,
  useEmotionRecords,
  useJudgements,
  useOppositeActionPlans,
  useScripts,
  useWiseMindCheckins,
} from "@/src/features/dbt/queries";
import { useDbtProgram } from "@/src/features/dbt/use-dbt-program";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useSelectedDate } from "@/src/stores/selected-date-store";

/**
 * ☠️ DBT's programme hook had NO hook-level test while CBT's and ACT's both did
 * (#2532, surprise 16) - and it is the third fork of the same six writers, so
 * the untested one is exactly where a divergence hides. #2550 edits three of
 * those writers, which is why this file arrives with that change rather than
 * after it.
 */

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/dbt/queries", () => ({
  useCopingPlan: jest.fn(),
  useDbtSessions: jest.fn(),
  useWiseMindCheckins: jest.fn(),
  useJudgements: jest.fn(),
  useEmotionRecords: jest.fn(),
  useOppositeActionPlans: jest.fn(),
  useScripts: jest.fn(),
}));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: jest.fn(),
  toLocalDateKey: (iso: string) => iso.slice(0, 10),
}));

// ---------------------------------------------------------------------------
// Typed mock references
// ---------------------------------------------------------------------------
const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;
const mockUseCopingPlan = useCopingPlan as jest.MockedFunction<typeof useCopingPlan>;
const mockUseDbtSessions = useDbtSessions as jest.MockedFunction<typeof useDbtSessions>;
const mockUseWiseMindCheckins = useWiseMindCheckins as jest.MockedFunction<
  typeof useWiseMindCheckins
>;
const mockUseJudgements = useJudgements as jest.MockedFunction<typeof useJudgements>;
const mockUseEmotionRecords = useEmotionRecords as jest.MockedFunction<typeof useEmotionRecords>;
const mockUseOppositeActionPlans = useOppositeActionPlans as jest.MockedFunction<
  typeof useOppositeActionPlans
>;
const mockUseScripts = useScripts as jest.MockedFunction<typeof useScripts>;
const mockUseSelectedDate = useSelectedDate as jest.MockedFunction<typeof useSelectedDate>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const STARTED_AT = "2026-06-01T09:00:00.000Z";
const COMPLETED_AT = "2026-06-20T09:00:00.000Z";
const TODAY = "2026-06-24";

function emptyList() {
  return { data: [], isLoading: false } as unknown as ReturnType<typeof useDbtSessions>;
}

function setupBaseMocks(mutateAsync: jest.Mock, isPending = false) {
  mockUseUpdateUserPreferences.mockReturnValue({
    mutateAsync,
    isPending,
  } as unknown as ReturnType<typeof useUpdateUserPreferences>);

  mockUseSelectedDate.mockReturnValue({ selectedDate: TODAY } as unknown as ReturnType<
    typeof useSelectedDate
  >);

  mockUseCopingPlan.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
    typeof useCopingPlan
  >);
  mockUseDbtSessions.mockReturnValue(emptyList());
  mockUseWiseMindCheckins.mockReturnValue(
    emptyList() as unknown as ReturnType<typeof useWiseMindCheckins>,
  );
  mockUseJudgements.mockReturnValue(emptyList() as unknown as ReturnType<typeof useJudgements>);
  mockUseEmotionRecords.mockReturnValue(
    emptyList() as unknown as ReturnType<typeof useEmotionRecords>,
  );
  mockUseOppositeActionPlans.mockReturnValue(
    emptyList() as unknown as ReturnType<typeof useOppositeActionPlans>,
  );
  mockUseScripts.mockReturnValue(emptyList() as unknown as ReturnType<typeof useScripts>);
}

function withPreferences(overrides: Record<string, unknown> = {}) {
  mockUseUserPreferences.mockReturnValue({
    data: { ...defaultUserPreferences, ...overrides },
    isLoading: false,
  } as unknown as ReturnType<typeof useUserPreferences>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("useDbtProgram - the writers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("startProgram sets a fresh start, phase 0 and a phase start, and clears the prompt", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync);
    withPreferences({ dbtProgramPromptDismissedAt: "2026-05-22T09:00:00.000Z" });

    const { result } = renderHook(() => useDbtProgram("user-1"));
    act(() => result.current.startProgram());

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        dbtProgramStartedAt: expect.any(String),
        dbtProgramPromptDismissedAt: null,
        dbtProgramPhaseIndex: 0,
        dbtProgramPhaseStartedAt: expect.any(String),
        dbtGraduationDismissedAt: null,
      }),
    );
    // ☠️ ADR-0012: starting again must not erase that you once finished. The
    // fresh `startedAt` retires the old completion by itself.
    expect(mutateAsync.mock.calls[0][0]).not.toHaveProperty("dbtProgramCompletedAt");
  });

  it("abandonProgram clears the start and hides the prompt, and touches nothing else", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync);
    withPreferences({
      dbtProgramStartedAt: STARTED_AT,
      dbtProgramCompletedAt: COMPLETED_AT,
      dbtProgramPhaseIndex: 2,
      dbtProgramPhaseStartedAt: STARTED_AT,
    });

    const { result } = renderHook(() => useDbtProgram("user-1"));
    act(() => result.current.abandonProgram());

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        dbtProgramStartedAt: null,
        dbtProgramPromptDismissedAt: expect.any(String),
      }),
    );

    const payload = mutateAsync.mock.calls[0][0];
    // ☠️ ADR-0012: leaving must not erase that you once finished it.
    expect(payload).not.toHaveProperty("dbtProgramCompletedAt");
    // ☠️ The fossil. `dbtProgramPhaseStartedAt` and `dbtProgramPhaseIndex` are
    // left standing, and that pair is the ONLY record this run ever existed.
    // #2551 pins the invariant properly; these two lines are a tripwire.
    expect(payload).not.toHaveProperty("dbtProgramPhaseStartedAt");
    expect(payload).not.toHaveProperty("dbtProgramPhaseIndex");
  });

  it("replayProgram restarts at phase 0 without retracting the completion", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync);
    withPreferences({
      dbtProgramStartedAt: STARTED_AT,
      dbtProgramCompletedAt: COMPLETED_AT,
      dbtProgramPhaseIndex: 3,
      dbtProgramPhaseStartedAt: STARTED_AT,
    });

    const { result } = renderHook(() => useDbtProgram("user-1"));
    act(() => result.current.replayProgram());

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        dbtProgramStartedAt: expect.any(String),
        dbtProgramPromptDismissedAt: null,
        dbtProgramPhaseIndex: 0,
        dbtProgramPhaseStartedAt: expect.any(String),
        dbtGraduationDismissedAt: null,
      }),
    );
    // ☠️ ADR-0012: replaying is a new run, not a retraction of the one that
    // finished. This is the half of #2386 that was fixed rather than refused.
    expect(mutateAsync.mock.calls[0][0]).not.toHaveProperty("dbtProgramCompletedAt");
  });

  it("advancePhase increments the phase and stamps a new phase start, mid-programme", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync);
    withPreferences({
      dbtProgramStartedAt: STARTED_AT,
      dbtProgramPhaseIndex: 0,
      dbtProgramPhaseStartedAt: STARTED_AT,
    });

    const { result } = renderHook(() => useDbtProgram("user-1"));
    act(() => result.current.advancePhase());

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        dbtProgramPhaseIndex: 1,
        dbtProgramPhaseStartedAt: expect.any(String),
      }),
    );
    expect(mutateAsync.mock.calls[0][0]).not.toHaveProperty("dbtProgramCompletedAt");
  });

  it("advancePhase on the last phase writes only the completion", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync);
    withPreferences({
      dbtProgramStartedAt: STARTED_AT,
      dbtProgramPhaseIndex: 3,
      dbtProgramPhaseStartedAt: STARTED_AT,
    });

    const { result } = renderHook(() => useDbtProgram("user-1"));
    act(() => result.current.advancePhase());

    const payload = mutateAsync.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({ dbtProgramCompletedAt: expect.any(String) }));
    // ☠️ This is what makes `completedAt >= startedAt` exact rather than a
    // heuristic: graduating writes the completion and NEVER touches
    // `startedAt`, so a later replay's fresh start retires it by itself.
    expect(payload).not.toHaveProperty("dbtProgramStartedAt");
    expect(payload).not.toHaveProperty("dbtProgramPhaseIndex");
  });

  it("dismisses and restores the start prompt", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync);
    withPreferences();

    const { result } = renderHook(() => useDbtProgram("user-1"));

    act(() => result.current.dismissProgramPrompt());
    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ dbtProgramPromptDismissedAt: expect.any(String) }),
    );

    act(() => result.current.showProgramPrompt());
    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ dbtProgramPromptDismissedAt: null }),
    );
  });

  it("writes nothing at all when preferences have not loaded", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync);
    mockUseUserPreferences.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useUserPreferences>);

    const { result } = renderHook(() => useDbtProgram("user-1"));

    act(() => result.current.startProgram());
    act(() => result.current.abandonProgram());
    act(() => result.current.replayProgram());
    act(() => result.current.advancePhase());

    expect(mutateAsync).not.toHaveBeenCalled();
  });
});

describe("useDbtProgram - the derived status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupBaseMocks(jest.fn().mockResolvedValue(undefined));
  });

  it("is graduated while the completion belongs to the current run", () => {
    withPreferences({
      dbtProgramStartedAt: STARTED_AT,
      dbtProgramCompletedAt: COMPLETED_AT,
      dbtProgramPhaseStartedAt: STARTED_AT,
    });

    const { result } = renderHook(() => useDbtProgram("user-1"));
    expect(result.current.program.status).toBe("graduated");
  });

  /**
   * ☠️ The case the whole change exists for. A completion now outlives the run
   * that earned it, so a replay must read as in progress rather than as already
   * finished. Before #2550 this state was unreachable, because every writer
   * nulled the column.
   */
  it("is in progress when an older completion predates the current run", () => {
    withPreferences({
      dbtProgramStartedAt: COMPLETED_AT,
      dbtProgramCompletedAt: STARTED_AT,
      dbtProgramPhaseStartedAt: COMPLETED_AT,
    });

    const { result } = renderHook(() => useDbtProgram("user-1"));
    expect(result.current.program.status).toBe("in_progress");
  });

  it("is not in progress when there is no start at all", () => {
    withPreferences({ dbtProgramCompletedAt: COMPLETED_AT });

    const { result } = renderHook(() => useDbtProgram("user-1"));
    expect(result.current.program.status).toBe("not_started");
  });
});
