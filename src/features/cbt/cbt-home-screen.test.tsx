import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Pressable as mockPressable, Text as mockText } from "react-native";
import type { ReactNode } from "react";

import CbtHomeScreen from "./cbt-home-screen";
import { useActivities } from "@/src/features/activities/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useCbtInsights } from "@/src/features/cbt/use-cbt-insights";
import { useGoals } from "@/src/features/goals/queries";
import { useMoodLogs, useSaveMoodLog } from "@/src/features/mood/queries";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useTasks } from "@/src/features/procrastination/queries";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSelfCareLog } from "@/src/features/self-care/queries";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
  usePathname: () => "/modules/cbt",
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: {
      id: "user-1",
    },
  }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateUserPreferences: jest.fn(),
  useUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/goals/queries", () => ({
  useGoals: jest.fn(),
}));

jest.mock("@/src/features/activities/queries", () => ({
  useActivities: jest.fn(),
}));

jest.mock("@/src/features/mood/queries", () => ({
  useMoodLogs: jest.fn(),
  useSaveMoodLog: jest.fn(),
}));

jest.mock("@/src/features/procrastination/queries", () => ({
  useTasks: jest.fn(),
}));

jest.mock("@/src/features/self-care/queries", () => ({
  useSelfCareLog: jest.fn(),
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

jest.mock("@/src/components/react-native-reusables/checkbox", () => {
  const Pressable = mockPressable;

  return {
    Checkbox: ({
      accessibilityLabel,
      checked,
      onCheckedChange,
    }: {
      accessibilityLabel?: string;
      checked?: boolean;
      onCheckedChange?: (checked: boolean) => void;
    }) => (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: Boolean(checked) }}
        onPress={() => onCheckedChange?.(!checked)}
      />
    ),
  };
});

jest.mock("@/src/components/react-native-reusables/label", () => {
  const Text = mockText;

  return {
    Label: ({ children, onPress }: { children?: ReactNode; onPress?: () => void }) => (
      <Text onPress={onPress}>{children}</Text>
    ),
  };
});

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;
const mockUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
const mockUseActivities = useActivities as jest.MockedFunction<typeof useActivities>;
const mockUseMoodLogs = useMoodLogs as jest.MockedFunction<typeof useMoodLogs>;
const mockUseSaveMoodLog = useSaveMoodLog as jest.MockedFunction<typeof useSaveMoodLog>;
const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
const mockUseSelfCareLog = useSelfCareLog as jest.MockedFunction<typeof useSelfCareLog>;
const mockUseThoughtRecords = useThoughtRecords as jest.MockedFunction<typeof useThoughtRecords>;
const mockUseRecoveryPlan = useRecoveryPlan as jest.MockedFunction<typeof useRecoveryPlan>;
const mockUseCbtInsights = useCbtInsights as jest.MockedFunction<typeof useCbtInsights>;

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
    mockUseGoals.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useGoals>);
    mockUseActivities.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useActivities>);
    mockUseMoodLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useMoodLogs>);
    mockUseSaveMoodLog.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useSaveMoodLog>);
    mockUseTasks.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useTasks>);
    mockUseSelfCareLog.mockReturnValue({
      data: null,
    } as unknown as ReturnType<typeof useSelfCareLog>);
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
  });

  it("shows CBT onboarding when the account flag is incomplete", () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtOnboardingCompleted: false,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<CbtHomeScreen />);

    expect(screen.getByText(/The CBT Toolkit/)).toBeTruthy();
    expect(screen.getByText("Get started")).toBeTruthy();
  });

  it("marks CBT onboarding complete when the user continues", async () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: true,
        cbtOnboardingCompleted: false,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<CbtHomeScreen />);

    fireEvent.press(screen.getByText("Get started"));
    fireEvent.press(screen.getByLabelText("Anxiety / Worry"));
    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          appOnboardingCompleted: true,
          cbtOnboardingCompleted: true,
          selectedConcerns: ["anxiety"],
        }),
      );
    });
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
});
