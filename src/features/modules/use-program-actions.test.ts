import { act, renderHook } from "@testing-library/react-native";

import { CBT_PROGRAM_KEYS, DBT_PROGRAM_KEYS } from "@/src/features/modules/program-patches";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useProgramActions } from "@/src/features/modules/use-program-actions";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;

function setupMocks(mutate: jest.Mock, preferences: unknown, isPending = false) {
  mockUseUserPreferences.mockReturnValue({
    data: preferences,
    isLoading: preferences === undefined,
  } as unknown as ReturnType<typeof useUserPreferences>);
  mockUseUpdateUserPreferences.mockReturnValue({
    mutate,
    isPending,
  } as unknown as ReturnType<typeof useUpdateUserPreferences>);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useProgramActions", () => {
  it("opts back INTO the global save-failed toast (#2810)", () => {
    // The whole point of the shared helper: these actions have no error surface
    // of their own, so the query-client fallback toast must not be suppressed.
    // Before #2810 every programme-state write failed in silence.
    setupMocks(jest.fn(), defaultUserPreferences);

    renderHook(() => useProgramActions("user-1", CBT_PROGRAM_KEYS, 5));

    expect(mockUseUpdateUserPreferences).toHaveBeenCalledWith("user-1", {
      suppressGlobalErrorToast: false,
    });
  });

  it("does nothing while preferences have not loaded", () => {
    const mutate = jest.fn();
    setupMocks(mutate, undefined);

    const { result } = renderHook(() => useProgramActions("user-1", CBT_PROGRAM_KEYS, 5));

    act(() => {
      result.current.startProgram();
      result.current.advancePhase();
      result.current.abandonProgram();
    });

    expect(mutate).not.toHaveBeenCalled();
  });

  it("writes through the module's own key map", () => {
    const mutate = jest.fn();
    setupMocks(mutate, { ...defaultUserPreferences, dbtProgramPhaseIndex: 1 });

    const { result } = renderHook(() => useProgramActions("user-1", DBT_PROGRAM_KEYS, 4));

    act(() => result.current.advancePhase());

    expect(mutate).toHaveBeenCalledWith({
      dbtProgramPhaseIndex: 2,
      dbtProgramPhaseStartedAt: expect.any(String),
    });
  });

  it("reflects the mutation's pending state and the dismissal reads", () => {
    setupMocks(jest.fn(), {
      ...defaultUserPreferences,
      cbtProgramPromptDismissedAt: "2026-09-01T00:00:00.000Z",
    });

    const { result } = renderHook(() => useProgramActions("user-1", CBT_PROGRAM_KEYS, 5));

    expect(result.current.isUpdating).toBe(false);
    expect(result.current.promptDismissedAt).toBe("2026-09-01T00:00:00.000Z");
    expect(result.current.graduationDismissedAt).toBeNull();
  });
});
