import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import BreathingScreen from "@/app/(app)/tools/breathing/index";
import { useBreathingSessions } from "@/src/features/breathing/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  usePathname: () => "/tools/breathing",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/breathing/queries", () => ({
  useBreathingSessions: jest.fn(),
}));

jest.mock("@/src/features/breathing/exercises-queries", () => ({
  useBreathingExercises: () => ({ data: [] }),
}));

jest.mock("@/src/components/app/help-sheet", () => ({
  HelpSheet: () => null,
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));
jest.mock("@/src/components/app/notification-settings-modal", () => ({
  NotificationSettingsModal: () => null,
}));
jest.mock("@/src/components/app/add-to-home-button", () => ({ AddToHomeButton: () => null }));
jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: undefined }),
  useUpdateShownButtonTours: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const mockUseBreathingSessions = useBreathingSessions as jest.MockedFunction<
  typeof useBreathingSessions
>;

describe("Breathing list polish", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBreathingSessions.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useBreathingSessions>);
  });

  it("renders the header title", () => {
    renderWithProviders(<BreathingScreen />);
    expect(screen.getByRole("heading", { name: "Breathing exercises" })).toBeTruthy();
  });

  it("renders tagline and the pattern stat", () => {
    renderWithProviders(<BreathingScreen />);
    expect(
      screen.getByText("Short guided patterns to calm your nervous system right now."),
    ).toBeTruthy();
    expect(screen.getByText("3 patterns")).toBeTruthy();
  });

  it("renders the Start a session entry", () => {
    renderWithProviders(<BreathingScreen />);
    expect(screen.getByText("Start a session")).toBeTruthy();
  });

  it("shows the empty history state when no sessions exist", () => {
    renderWithProviders(<BreathingScreen />);
    expect(screen.getByText("Session history")).toBeTruthy();
    expect(screen.getByText("No sessions yet.")).toBeTruthy();
  });

  it("lists sessions in the inline history with pattern, cycles, and elapsed time", () => {
    mockUseBreathingSessions.mockReturnValue({
      data: [
        {
          id: "s1",
          userId: "user-1",
          exerciseName: "box-breathing",
          durationMinutes: 2,
          durationSeconds: 96,
          cycles: 6,
          reflection: "",
          moodAfter: null,
          feelingAfter: null,
          completedAt: "2026-05-28T10:00:00Z",
          createdAt: "2026-05-28T10:00:00Z",
        },
      ],
    } as unknown as ReturnType<typeof useBreathingSessions>);

    renderWithProviders(<BreathingScreen />);
    expect(screen.getByText("Box breathing")).toBeTruthy();
    expect(screen.getByText("6 cycles")).toBeTruthy();
    expect(screen.getByText("1:36")).toBeTruthy(); // formatClock(96)
  });

  it("navigates to the session route on Start a session press", () => {
    renderWithProviders(<BreathingScreen />);
    fireEvent.press(screen.getByLabelText("Start a session"));
    expect(router.push).toHaveBeenCalledWith("/tools/breathing/session");
  });

  it("opens help sheet when help button is pressed", () => {
    renderWithProviders(<BreathingScreen />);
    const helpButton = screen.getByLabelText("About breathing");
    fireEvent.press(helpButton);
    // HelpSheet is mocked to null; pressing the button should not throw
    expect(helpButton).toBeTruthy();
  });

  it("shows the empty state for custom exercises", () => {
    renderWithProviders(<BreathingScreen />);
    expect(screen.getByText("You haven't made any yet.")).toBeTruthy();
  });
});
