import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import HabitsHomeScreen from "./habits-home-screen";
import { useHabitLogs, useHabits, useToggleHabitLog } from "@/src/features/habits/queries";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { todayLocalDateString } from "@/src/features/habits/scheduling";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
  usePathname: () => "/tools/habits",
  useFocusEffect: jest.fn(),
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
}));

jest.mock("@/src/components/app/notification-settings-modal", () => ({
  NotificationSettingsModal: () => null,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateUserPreferences: jest.fn(),
  useUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/habits/queries", () => ({
  useHabits: jest.fn(),
  useHabitLogs: jest.fn(),
  useToggleHabitLog: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;
const mockUseHabits = useHabits as jest.MockedFunction<typeof useHabits>;
const mockUseHabitLogs = useHabitLogs as jest.MockedFunction<typeof useHabitLogs>;
const mockUseToggleHabitLog = useToggleHabitLog as jest.MockedFunction<typeof useToggleHabitLog>;

void router;

describe("HabitsHomeScreen tap-to-tick", () => {
  const toggleMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseUserPreferences.mockReturnValue({
      data: { ...defaultUserPreferences, habitsOnboardingCompleted: true },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    mockUseUpdateUserPreferences.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useUpdateUserPreferences>);

    mockUseHabits.mockReturnValue({
      data: [
        {
          id: "h-1",
          userId: "user-1",
          name: "Read",
          kind: "build",
          identity: "I'm a reader",
          cuePlan: "",
          stackAfter: "",
          cravingPairing: "",
          twoMinuteVersion: "Read one page",
          rewardNote: "",
          cadence: "daily",
          customDays: [],
          color: "primary",
          archivedAt: null,
          createdAt: "2026-05-01T08:00:00.000Z",
          updatedAt: "2026-05-01T08:00:00.000Z",
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useHabits>);

    mockUseHabitLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useHabitLogs>);

    mockUseToggleHabitLog.mockReturnValue({
      isPending: false,
      mutate: toggleMutate,
    } as unknown as ReturnType<typeof useToggleHabitLog>);
  });

  it("calls toggleHabitLog with today's date when the tick is pressed", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    const tickButton = await screen.findByRole("checkbox", {
      name: /Tap to tick today/i,
    });

    fireEvent.press(tickButton);

    await waitFor(() => {
      expect(toggleMutate).toHaveBeenCalledWith({
        habitId: "h-1",
        loggedOn: todayLocalDateString(),
      });
    });
  });
});
