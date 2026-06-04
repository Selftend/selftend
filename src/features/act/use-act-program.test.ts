import { act, renderHook } from "@testing-library/react-native";

import {
  useAllActionSteps,
  useChoicePoints,
  useCommittedActions,
  useConnectionLogs,
  useDefusionLogs,
  useExpansionLogs,
  useObservingSelfSessions,
  useUrgeSurfLogs,
  useValueEntries,
} from "@/src/features/act/queries";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { useActProgram } from "@/src/features/act/use-act-program";

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/act/queries", () => ({
  useAllActionSteps: jest.fn(),
  useChoicePoints: jest.fn(),
  useCommittedActions: jest.fn(),
  useConnectionLogs: jest.fn(),
  useDefusionLogs: jest.fn(),
  useExpansionLogs: jest.fn(),
  useObservingSelfSessions: jest.fn(),
  useUrgeSurfLogs: jest.fn(),
  useValueEntries: jest.fn(),
}));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: jest.fn(),
  toLocalDateKey: (iso: string) => iso.slice(0, 10),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;
const mockUseSelectedDate = useSelectedDate as jest.MockedFunction<typeof useSelectedDate>;

const actQueryMocks = [
  useAllActionSteps,
  useChoicePoints,
  useCommittedActions,
  useConnectionLogs,
  useDefusionLogs,
  useExpansionLogs,
  useObservingSelfSessions,
  useUrgeSurfLogs,
  useValueEntries,
] as jest.MockedFunction<typeof useDefusionLogs>[];

function setupBaseMocks(mutateAsync: jest.Mock) {
  mockUseSelectedDate.mockReturnValue({ selectedDate: "2026-05-24", isToday: true });
  mockUseUpdateUserPreferences.mockReturnValue({
    mutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateUserPreferences>);
  for (const queryMock of actQueryMocks) {
    queryMock.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useDefusionLogs>);
  }
}

describe("useActProgram - graduation dismissal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("dismissGraduation persists a non-null actGraduationDismissedAt", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync);
    mockUseUserPreferences.mockReturnValue({
      data: { ...defaultUserPreferences },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    const { result } = renderHook(() => useActProgram("user-1"));
    act(() => result.current.dismissGraduation());

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ actGraduationDismissedAt: expect.any(String) }),
    );
  });

  it("exposes graduationDismissedAt from preferences", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync);
    mockUseUserPreferences.mockReturnValue({
      data: { ...defaultUserPreferences, actGraduationDismissedAt: "2026-05-20T00:00:00.000Z" },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    const { result } = renderHook(() => useActProgram("user-1"));
    expect(result.current.graduationDismissedAt).toBe("2026-05-20T00:00:00.000Z");
  });

  it("startProgram clears actGraduationDismissedAt", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync);
    mockUseUserPreferences.mockReturnValue({
      data: { ...defaultUserPreferences, actGraduationDismissedAt: "2026-05-20T00:00:00.000Z" },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    const { result } = renderHook(() => useActProgram("user-1"));
    act(() => result.current.startProgram());

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ actGraduationDismissedAt: null }),
    );
  });

  it("replayProgram clears actGraduationDismissedAt", () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    setupBaseMocks(mutateAsync);
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        actProgramStartedAt: "2026-05-01T00:00:00.000Z",
        actProgramCompletedAt: "2026-05-10T00:00:00.000Z",
        actGraduationDismissedAt: "2026-05-20T00:00:00.000Z",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    const { result } = renderHook(() => useActProgram("user-1"));
    act(() => result.current.replayProgram());

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ actGraduationDismissedAt: null }),
    );
  });
});
