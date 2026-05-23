import { fireEvent, screen } from "@testing-library/react-native";

import CbtHomeScreen from "./cbt-home-screen";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useCbtInsights } from "@/src/features/cbt/use-cbt-insights";
import { useCbtProgram } from "@/src/features/cbt/use-cbt-program";
import { useGoals } from "@/src/features/goals/queries";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import {
  useUpdateShownButtonTours,
  useUpdateUserPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
  },
  usePathname: () => "/modules/cbt",
  useFocusEffect: jest.fn(),
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
}));

jest.mock("@/src/components/app/notification-settings-modal", () => ({
  NotificationSettingsModal: () => null,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: {
      id: "user-1",
    },
  }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateShownButtonTours: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
  useUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/goals/queries", () => ({
  useGoals: jest.fn(),
}));

jest.mock("@/src/features/cbt/queries", () => ({
  useThoughtRecords: jest.fn(),
}));

jest.mock("@/src/features/recovery/queries", () => ({
  useRecoveryPlan: jest.fn(),
}));

jest.mock("@/src/features/cbt/use-cbt-insights", () => ({
  useCbtInsights: jest.fn(),
}));

jest.mock("@/src/features/cbt/use-cbt-program", () => ({
  useCbtProgram: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateShownButtonTours = useUpdateShownButtonTours as jest.MockedFunction<
  typeof useUpdateShownButtonTours
>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;
const mockUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
const mockUseThoughtRecords = useThoughtRecords as jest.MockedFunction<typeof useThoughtRecords>;
const mockUseRecoveryPlan = useRecoveryPlan as jest.MockedFunction<typeof useRecoveryPlan>;
const mockUseCbtInsights = useCbtInsights as jest.MockedFunction<typeof useCbtInsights>;
const mockUseCbtProgram = useCbtProgram as jest.MockedFunction<typeof useCbtProgram>;

describe("CbtHomeScreen onboarding", () => {
  const mutateAsync = jest.fn().mockResolvedValue(defaultUserPreferences);

  beforeEach(() => {
    jest.clearAllMocks();
    mutateAsync.mockResolvedValue(defaultUserPreferences);
    mockUseUpdateUserPreferences.mockReturnValue({
      isError: false,
      isPending: false,
      mutateAsync,
    } as unknown as ReturnType<typeof useUpdateUserPreferences>);
    mockUseUpdateShownButtonTours.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useUpdateShownButtonTours>);
    mockUseGoals.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useGoals>);
    mockUseThoughtRecords.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useThoughtRecords>);
    mockUseRecoveryPlan.mockReturnValue({
      data: null,
    } as unknown as ReturnType<typeof useRecoveryPlan>);
    mockUseCbtInsights.mockReturnValue({
      activityMoodLiftByCategory: [],
      angerPattern: null,
      beliefReviewSuggestions: [],
      exerciseMoodLift: null,
      exposureProgress: null,
      recurringThoughtSuggestions: [],
      selfCareTrend: null,
      slogan: "",
      topDistortions: [],
    });
    mockUseCbtProgram.mockReturnValue({
      program: {
        status: "not_started",
        startedAt: null,
        currentWeekIndex: 0,
        totalWeeks: 4,
        weeks: [],
        weeksComplete: 0,
        allWeeksComplete: false,
        summaryStats: {
          thoughtRecords: 0,
          activitiesCompleted: 0,
          goalsSet: 0,
          beliefsExamined: 0,
        },
      },
      isLoading: false,
      isUpdating: false,
      abandonProgram: jest.fn(),
      dismissProgramPrompt: jest.fn(),
      promptDismissedAt: null,
      startProgram: jest.fn(),
      showProgramPrompt: jest.fn(),
      replayProgram: jest.fn(),
    } as unknown as ReturnType<typeof useCbtProgram>);
  });

  it("does not show CBT onboarding after completion", () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtOnboardingCompleted: true,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<CbtHomeScreen />);

    expect(screen.queryByText(/The CBT Toolkit/)).toBeNull();
  });

  it("shows the program start card and no concern guidance", () => {
    mockUseUserPreferences.mockReturnValue({
      data: { ...defaultUserPreferences, cbtOnboardingCompleted: true },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<CbtHomeScreen />);

    expect(screen.getByText("Start program")).toBeTruthy();
    expect(screen.queryByText("Today check-in")).toBeNull();
    expect(screen.queryByText("Today")).toBeNull();
    expect(screen.queryByText("Mood summaries")).toBeNull();
    expect(screen.queryByText("Quick actions")).toBeNull();
    expect(screen.queryByText(/Suggested for/)).toBeNull();
  });

  it("hides a dismissed start card and restores it from the header program action", () => {
    const showProgramPrompt = jest.fn();
    mockUseUserPreferences.mockReturnValue({
      data: { ...defaultUserPreferences, cbtOnboardingCompleted: true },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
    mockUseCbtProgram.mockReturnValue({
      program: {
        status: "not_started",
        startedAt: null,
        currentWeekIndex: 0,
        totalWeeks: 4,
        weeks: [],
        weeksComplete: 0,
        allWeeksComplete: false,
        summaryStats: {
          thoughtRecords: 0,
          activitiesCompleted: 0,
          goalsSet: 0,
          beliefsExamined: 0,
        },
      },
      isLoading: false,
      isUpdating: false,
      abandonProgram: jest.fn(),
      dismissProgramPrompt: jest.fn(),
      promptDismissedAt: "2026-05-22T09:00:00.000Z",
      replayProgram: jest.fn(),
      showProgramPrompt,
      startProgram: jest.fn(),
    } as unknown as ReturnType<typeof useCbtProgram>);

    renderWithProviders(<CbtHomeScreen />);

    expect(screen.queryByText("Start program")).toBeNull();
    fireEvent.press(screen.getByLabelText("Show the CBT program invitation"));
    expect(showProgramPrompt).toHaveBeenCalled();
  });

  it("confirms before abandoning an in-progress program", () => {
    const abandonProgram = jest.fn();
    mockUseUserPreferences.mockReturnValue({
      data: { ...defaultUserPreferences, cbtOnboardingCompleted: true },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
    mockUseCbtProgram.mockReturnValue({
      program: {
        status: "in_progress",
        startedAt: "2026-05-01T00:00:00.000Z",
        currentWeekIndex: 0,
        totalWeeks: 4,
        weeks: [
          {
            key: "foundation",
            themeLabelKey: "program.weeks.foundation",
            pillar: "think",
            done: false,
            tasks: [
              {
                key: "thoughtRecord",
                labelKey: "program.tasks.oneThoughtRecord",
                route: "/modules/cbt/new",
                current: 0,
                target: 1,
                done: false,
              },
            ],
          },
        ],
        weeksComplete: 0,
        allWeeksComplete: false,
        summaryStats: {
          thoughtRecords: 0,
          activitiesCompleted: 0,
          goalsSet: 0,
          beliefsExamined: 0,
        },
      },
      isLoading: false,
      isUpdating: false,
      abandonProgram,
      dismissProgramPrompt: jest.fn(),
      promptDismissedAt: null,
      replayProgram: jest.fn(),
      showProgramPrompt: jest.fn(),
      startProgram: jest.fn(),
    } as unknown as ReturnType<typeof useCbtProgram>);

    renderWithProviders(<CbtHomeScreen />);

    fireEvent.press(screen.getByText("Abandon program"));
    expect(screen.getByText("Abandon this program?")).toBeTruthy();

    fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    expect(abandonProgram).toHaveBeenCalled();
  });
});
