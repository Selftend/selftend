import { screen } from "@testing-library/react-native";
import { Text as mockText } from "react-native";
import type { ReactNode } from "react";

import RecoveryScreen from "../../../app/(app)/modules/cbt/recovery";
import { useActivities } from "@/src/features/activities/queries";
import { useAngerLogs } from "@/src/features/anger/queries";
import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useAllExposureItems, useHierarchies } from "@/src/features/exposure/queries";
import { useGoals } from "@/src/features/goals/queries";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useTasks } from "@/src/features/procrastination/queries";
import {
  useChallengePlans,
  useDeleteChallengePlan,
  useRecoveryPlan,
  useSaveChallengePlan,
  useUpsertRecoveryPlan,
} from "@/src/features/recovery/queries";
import { useSelfCareLogs } from "@/src/features/self-care/queries";
import { useUserPreferences } from "@/src/features/settings/queries";
import { useValuesProfiles } from "@/src/features/values/queries";
import { useWorryEntries } from "@/src/features/worry/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: {
      id: "user-1",
    },
  }),
}));

jest.mock("@/src/components/react-native-reusables/label", () => {
  const Text = mockText;

  return {
    Label: ({ children, onPress }: { children?: ReactNode; onPress?: () => void }) => (
      <Text onPress={onPress}>{children}</Text>
    ),
  };
});

jest.mock("@/src/features/activities/queries", () => ({
  useActivities: jest.fn(),
}));

jest.mock("@/src/features/anger/queries", () => ({
  useAngerLogs: jest.fn(),
}));

jest.mock("@/src/features/beliefs/queries", () => ({
  useCoreBeliefs: jest.fn(),
}));

jest.mock("@/src/features/cbt/queries", () => ({
  useThoughtRecords: jest.fn(),
}));

jest.mock("@/src/features/exposure/queries", () => ({
  useAllExposureItems: jest.fn(),
  useHierarchies: jest.fn(),
}));

jest.mock("@/src/features/goals/queries", () => ({
  useGoals: jest.fn(),
}));

jest.mock("@/src/features/mindfulness/queries", () => ({
  useMindfulnessSessions: jest.fn(),
}));

jest.mock("@/src/features/mood/queries", () => ({
  useMoodLogs: jest.fn(),
}));

jest.mock("@/src/features/procrastination/queries", () => ({
  useTasks: jest.fn(),
}));

jest.mock("@/src/features/recovery/queries", () => ({
  useChallengePlans: jest.fn(),
  useDeleteChallengePlan: jest.fn(),
  useRecoveryPlan: jest.fn(),
  useSaveChallengePlan: jest.fn(),
  useUpsertRecoveryPlan: jest.fn(),
}));

jest.mock("@/src/features/self-care/queries", () => ({
  useSelfCareLogs: jest.fn(),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/values/queries", () => ({
  useValuesProfiles: jest.fn(),
}));

jest.mock("@/src/features/worry/queries", () => ({
  useWorryEntries: jest.fn(),
}));

const mockUseActivities = useActivities as jest.MockedFunction<typeof useActivities>;
const mockUseAngerLogs = useAngerLogs as jest.MockedFunction<typeof useAngerLogs>;
const mockUseCoreBeliefs = useCoreBeliefs as jest.MockedFunction<typeof useCoreBeliefs>;
const mockUseThoughtRecords = useThoughtRecords as jest.MockedFunction<typeof useThoughtRecords>;
const mockUseAllExposureItems = useAllExposureItems as jest.MockedFunction<
  typeof useAllExposureItems
>;
const mockUseHierarchies = useHierarchies as jest.MockedFunction<typeof useHierarchies>;
const mockUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
const mockUseMindfulnessSessions = useMindfulnessSessions as jest.MockedFunction<
  typeof useMindfulnessSessions
>;
const mockUseMoodLogs = useMoodLogs as jest.MockedFunction<typeof useMoodLogs>;
const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
const mockUseChallengePlans = useChallengePlans as jest.MockedFunction<typeof useChallengePlans>;
const mockUseDeleteChallengePlan = useDeleteChallengePlan as jest.MockedFunction<
  typeof useDeleteChallengePlan
>;
const mockUseRecoveryPlan = useRecoveryPlan as jest.MockedFunction<typeof useRecoveryPlan>;
const mockUseSaveChallengePlan = useSaveChallengePlan as jest.MockedFunction<
  typeof useSaveChallengePlan
>;
const mockUseUpsertRecoveryPlan = useUpsertRecoveryPlan as jest.MockedFunction<
  typeof useUpsertRecoveryPlan
>;
const mockUseSelfCareLogs = useSelfCareLogs as jest.MockedFunction<typeof useSelfCareLogs>;
const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseValuesProfiles = useValuesProfiles as jest.MockedFunction<typeof useValuesProfiles>;
const mockUseWorryEntries = useWorryEntries as jest.MockedFunction<typeof useWorryEntries>;

function mockEmptyStrategyData() {
  mockUseActivities.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useActivities>);
  mockUseAngerLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useAngerLogs>);
  mockUseCoreBeliefs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useCoreBeliefs>);
  mockUseThoughtRecords.mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useThoughtRecords>);
  mockUseAllExposureItems.mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useAllExposureItems>);
  mockUseHierarchies.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useHierarchies>);
  mockUseGoals.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useGoals>);
  mockUseMindfulnessSessions.mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useMindfulnessSessions>);
  mockUseMoodLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useMoodLogs>);
  mockUseTasks.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useTasks>);
  mockUseSelfCareLogs.mockReturnValue({ data: [] } as unknown as ReturnType<
    typeof useSelfCareLogs
  >);
  mockUseValuesProfiles.mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useValuesProfiles>);
  mockUseWorryEntries.mockReturnValue({ data: [] } as unknown as ReturnType<
    typeof useWorryEntries
  >);
}

describe("RecoveryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmptyStrategyData();
    mockUseUserPreferences.mockReturnValue({
      data: { activeStrategies: [] },
    } as unknown as ReturnType<typeof useUserPreferences>);
    mockUseChallengePlans.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useChallengePlans>);
    mockUseUpsertRecoveryPlan.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useUpsertRecoveryPlan>);
    mockUseSaveChallengePlan.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useSaveChallengePlan>);
    mockUseDeleteChallengePlan.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useDeleteChallengePlan>);
  });

  it("shows the loading state while the recovery plan is pending", () => {
    mockUseRecoveryPlan.mockReturnValue({
      data: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useRecoveryPlan>);

    renderWithProviders(<RecoveryScreen />);

    expect(screen.getByText("Loading recovery plan...")).toBeTruthy();
  });

  it("hydrates an existing plan and shows challenge editing entry points", async () => {
    mockUseRecoveryPlan.mockReturnValue({
      data: {
        createdAt: "2026-05-01T10:00:00.000Z",
        id: "plan-1",
        maintenanceCommitments: ["Weekly review"],
        personalSlogan: "Keep practicing",
        recoveryKeys: ["Walk first"],
        strategyIntegrationNotes: {
          thoughts: "Use thought records when I spiral.",
        },
        updatedAt: "2026-05-02T10:00:00.000Z",
        userId: "user-1",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useRecoveryPlan>);
    mockUseChallengePlans.mockReturnValue({
      data: [
        {
          challengeDescription: "Hard week at work",
          copingSteps: ["Text a trusted person"],
          createdAt: "2026-05-03T10:00:00.000Z",
          id: "challenge-1",
          recoveryPlanId: "plan-1",
          updatedAt: "2026-05-03T10:00:00.000Z",
          userId: "user-1",
        },
      ],
    } as unknown as ReturnType<typeof useChallengePlans>);

    renderWithProviders(<RecoveryScreen />);

    expect(await screen.findByText("Update plan")).toBeTruthy();
    expect(screen.getByText("Hard week at work")).toBeTruthy();
    expect(screen.getByText("Text a trusted person")).toBeTruthy();
    expect(screen.getByText("Edit")).toBeTruthy();
  });
});
