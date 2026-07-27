import { screen } from "@testing-library/react-native";

import MeditationHomeScreen from "@/src/features/meditation/meditation-home-screen";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { useUserPreferences } from "@/src/features/settings/queries";
import { roomVariables } from "@/src/lib/module-room";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({}),
  usePathname: () => "/tools/meditation",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationProgramState: () => ({ data: { currentStage: 3, preferredDurationMinutes: 15 } }),
  useMeditationSessions: jest.fn(),
  useMeditationSessionCount: () => ({ data: 12 }),
  useUpsertMeditationProgramState: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
  useUpdateUserPreferences: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateShownButtonTours: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

// The timer owns audio, haptics and interval state - none of it is what this
// suite is about, and the today card it sits in is asserted by its title.
jest.mock("@/src/features/timer/timer-widget", () => ({ TimerWidget: () => null }));
jest.mock("@/src/components/app/meditation-info-modal", () => ({ MeditationInfo: () => null }));
jest.mock("@/src/components/app/meditation-onboarding-modal", () => ({
  MeditationOnboarding: () => null,
}));
jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));
jest.mock("@/src/components/app/notification-settings-modal", () => ({
  NotificationSettingsModal: () => null,
}));
jest.mock("@/src/components/app/add-to-home-button", () => ({ AddToHomeButton: () => null }));

const mockUseMeditationSessions = useMeditationSessions as jest.MockedFunction<
  typeof useMeditationSessions
>;
const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;

const session = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  userId: "user-1",
  durationMinutes: 20,
  stageAtSession: 3,
  completedAt: "2026-05-28T10:00:00Z",
  createdAt: "2026-05-28T10:00:00Z",
  ...overrides,
});

const setSessions = (data: unknown) =>
  mockUseMeditationSessions.mockReturnValue({ data } as unknown as ReturnType<
    typeof useMeditationSessions
  >);

describe("MeditationHomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSessions(undefined);
    mockUseUserPreferences.mockReturnValue({
      data: { enabledModules: ["meditation"] },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
  });

  it("renders the header title, description, and all three stats", () => {
    // Logged at stage 2 while the program has moved on to 3, so the hero's
    // stage stat can't be confused with a session row's stage badge.
    setSessions([
      session({ stageAtSession: 2 }),
      session({ id: "s2", durationMinutes: 10, stageAtSession: 2 }),
    ]);

    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.getByRole("heading", { name: "Meditation" })).toBeTruthy();
    expect(
      screen.getByText("Train steady attention and clear awareness, one sit at a time."),
    ).toBeTruthy();
    expect(screen.getByText("Stage 3")).toBeTruthy();
    // The lifetime count comes from the count query, not the capped session list.
    expect(screen.getByText("12 sessions")).toBeTruthy();
    expect(screen.getByText("15 min")).toBeTruthy();
    expect(screen.getByText("Median")).toBeTruthy();
  });

  it("renders the iris room: field header and room pour", () => {
    renderWithProviders(<MeditationHomeScreen />);

    // Full-bleed iris field header (Direction B room), not the plain header.
    expect(screen.getByTestId("module-field-gradient")).toBeTruthy();
    // The root carries the iris room re-pour; a wrong or missing room fails here.
    expect(screen.getByTestId("meditation-home-room").props.style).toEqual(
      roomVariables("iris").light,
    );
  });

  it("keeps the room poured on the loading return", () => {
    mockUseUserPreferences.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<MeditationHomeScreen />);

    // Preferences are still in flight - the room may not drop out and snap in.
    expect(screen.getByTestId("meditation-home-room").props.style).toEqual(
      roomVariables("iris").light,
    );
  });

  it("omits the subline until history has actually loaded", () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "no sessions" there would erase a returning user's real history.
    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.queryByText("No sessions logged yet")).toBeNull();
    expect(screen.queryByText(/^Last · /)).toBeNull();
  });

  it("shows the never subline once an empty history has loaded", () => {
    setSessions([]);

    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.getByText("No sessions logged yet")).toBeTruthy();
  });

  it("shows the last-session subline when sessions exist", () => {
    setSessions([session()]);

    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.getByText(/^Last · /)).toBeTruthy();
    expect(screen.queryByText("No sessions logged yet")).toBeNull();
  });
});
