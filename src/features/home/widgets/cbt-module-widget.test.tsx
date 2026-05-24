import { screen } from "@testing-library/react-native";

import { CbtModuleWidget } from "@/src/features/home/widgets/cbt-module-widget";
import type { CbtProgramView } from "@/src/features/cbt/derive-program";
import { useCbtProgram } from "@/src/features/cbt/use-cbt-program";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useActivities } from "@/src/features/activities/queries";
import { useSelfCareLog } from "@/src/features/self-care/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/src/features/cbt/use-cbt-program", () => ({
  useCbtProgram: jest.fn(),
}));

jest.mock("@/src/features/cbt/queries", () => ({
  useThoughtRecords: jest.fn(),
}));

jest.mock("@/src/features/activities/queries", () => ({
  useActivities: jest.fn(),
}));

jest.mock("@/src/features/self-care/queries", () => ({
  useSelfCareLog: jest.fn(),
}));

const mockUseCbtProgram = useCbtProgram as jest.MockedFunction<typeof useCbtProgram>;
const mockUseThoughtRecords = useThoughtRecords as jest.MockedFunction<typeof useThoughtRecords>;
const mockUseActivities = useActivities as jest.MockedFunction<typeof useActivities>;
const mockUseSelfCareLog = useSelfCareLog as jest.MockedFunction<typeof useSelfCareLog>;

function program(overrides: Partial<CbtProgramView> = {}): CbtProgramView {
  return {
    status: "in_progress",
    startedAt: "2026-05-01T00:00:00.000Z",
    summaryStats: {
      thoughtRecords: 0,
      activitiesCompleted: 0,
      goalsSet: 0,
      beliefsExamined: 0,
    },
    phaseIndex: 1,
    totalPhases: 5,
    isLastPhase: false,
    phase: {
      key: "formulation",
      themeLabelKey: "program.weeks.formulation.title",
      themeSubKey: "program.weeks.formulation.sub",
      themeDescKey: "program.weeks.formulation.description",
      milestones: [
        {
          key: "one",
          labelKey: "program.tasks.examineBelief",
          route: "/modules/cbt/beliefs",
          current: 1,
          target: 1,
          done: true,
        },
        {
          key: "two",
          labelKey: "program.tasks.setGoals",
          route: "/modules/cbt/goals/new",
          current: 0,
          target: 1,
          done: false,
        },
      ],
      dailyPractice: null,
    },
    phaseReady: false,
    ...overrides,
  };
}

describe("CbtModuleWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCbtProgram.mockReturnValue({
      program: program(),
      isLoading: false,
      isUpdating: false,
      abandonProgram: jest.fn(),
      advancePhase: jest.fn(),
      dismissProgramPrompt: jest.fn(),
      promptDismissedAt: null,
      replayProgram: jest.fn(),
      showProgramPrompt: jest.fn(),
      startProgram: jest.fn(),
    });
    mockUseThoughtRecords.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useThoughtRecords
    >);
    mockUseActivities.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useActivities>);
    mockUseSelfCareLog.mockReturnValue({ data: null } as unknown as ReturnType<
      typeof useSelfCareLog
    >);
  });

  it("shows the current CBT program summary", () => {
    renderWithProviders(<CbtModuleWidget userId="user-1" />);

    expect(screen.getByText("Phase 2 of 5")).toBeTruthy();
    expect(screen.getByText("1/2 done this phase")).toBeTruthy();
  });

  it("shows the available program when it has not started", () => {
    mockUseCbtProgram.mockReturnValue({
      program: program({
        status: "not_started",
        startedAt: null,
        phaseIndex: 0,
        phase: null,
        phaseReady: false,
      }),
      isLoading: false,
      isUpdating: false,
      abandonProgram: jest.fn(),
      advancePhase: jest.fn(),
      dismissProgramPrompt: jest.fn(),
      promptDismissedAt: null,
      replayProgram: jest.fn(),
      showProgramPrompt: jest.fn(),
      startProgram: jest.fn(),
    });

    renderWithProviders(<CbtModuleWidget userId="user-1" />);

    expect(screen.getByText("CBT program")).toBeTruthy();
    expect(screen.getByText("Guided structure is ready when you want it.")).toBeTruthy();
  });
});
