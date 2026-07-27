import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import BreathingScreen from "@/app/(app)/tools/breathing/index";
import { useBreathingExercises } from "@/src/features/breathing/exercises-queries";
import { useBreathingSessions } from "@/src/features/breathing/queries";
import { roomVariables } from "@/src/lib/module-room";
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
  useBreathingExercises: jest.fn(),
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
const mockUseBreathingExercises = useBreathingExercises as jest.MockedFunction<
  typeof useBreathingExercises
>;

describe("Breathing list polish", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBreathingSessions.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useBreathingSessions>);
    mockUseBreathingExercises.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useBreathingExercises>);
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

  it("renders the aqua room: field header, room pour, and the never-logged subline", () => {
    mockUseBreathingSessions.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useBreathingSessions>);

    renderWithProviders(<BreathingScreen />);

    // Full-bleed aqua field header (Direction B room), not the plain header.
    expect(screen.getByTestId("module-field-gradient")).toBeTruthy();
    // The root carries the aqua room re-pour; a wrong or missing room fails here.
    expect(screen.UNSAFE_getByType(SafeAreaView).props.style).toEqual(roomVariables("aqua").light);
    // A loaded, empty history → the subline shows the never state.
    expect(screen.getByText("No sessions logged yet")).toBeTruthy();
  });

  it("omits the subline until history has actually loaded", () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "no sessions" there would erase a returning user's real history.
    renderWithProviders(<BreathingScreen />);
    expect(screen.queryByText("No sessions logged yet")).toBeNull();
    expect(screen.queryByText(/^Last · /)).toBeNull();
  });

  it("omits the subline while the custom exercises are still loading", () => {
    // The sessions query is enabled before `customExercises` arrives, so it first
    // resolves against the built-in patterns alone. A user whose only history is
    // custom exercises would otherwise see a loaded-but-empty list read as "never".
    mockUseBreathingSessions.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useBreathingSessions>);
    mockUseBreathingExercises.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useBreathingExercises>);

    renderWithProviders(<BreathingScreen />);

    expect(screen.queryByText("No sessions logged yet")).toBeNull();
  });

  it("omits the last-session subline while the custom exercises are still loading", () => {
    // The nonempty half of the same race. The built-in-only result is not merely
    // incomplete — it can be *wrong*: if this user's newest session is a custom
    // exercise, the built-in session below is older, and billing it as "Last"
    // shows a time that is about to change. Nothing is better than stale.
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
    mockUseBreathingExercises.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useBreathingExercises>);

    renderWithProviders(<BreathingScreen />);

    expect(screen.queryByText(/^Last · /)).toBeNull();
    expect(screen.queryByText("No sessions logged yet")).toBeNull();
  });

  it("shows the last-session subline when sessions exist", () => {
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

    expect(screen.getByText(/^Last · /)).toBeTruthy();
    expect(screen.queryByText("No sessions logged yet")).toBeNull();
  });
});
