import { screen } from "@testing-library/react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MeditationHomeScreen from "@/src/features/meditation/meditation-home-screen";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { useUserPreferences } from "@/src/features/settings/queries";
import { roomVariables } from "@/src/lib/module-room";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  useLocalSearchParams: () => ({}),
  usePathname: () => "/tools/meditation",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationSessions: jest.fn(),
  useMeditationSessionCount: () => ({ data: undefined }),
  useMeditationProgramState: () => ({ data: { currentStage: 1 } }),
  useUpsertMeditationProgramState: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
  useUpdateUserPreferences: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateShownButtonTours: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

// The timer owns its own intervals and sound handles - out of scope here, and
// #339 is explicit that TimerWidget takes the room via its container.
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

  it("renders the header title, description, and the three hero stats", () => {
    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.getByRole("heading", { name: "Meditation" })).toBeTruthy();
    expect(
      screen.getByText("Train steady attention and clear awareness, one sit at a time."),
    ).toBeTruthy();
    // All three existing stats ride on the field (gratitude precedent) - trimming
    // one would be a content change in a visual workstream.
    expect(screen.getByText("Stage 1")).toBeTruthy();
    expect(screen.getByText("0 sessions")).toBeTruthy();
    expect(screen.getByText("Median")).toBeTruthy();
    expect(screen.getByText("Inspired by The Mind Illuminated · Culadasa")).toBeTruthy();
  });

  it("renders the iris room: field header and room pour", () => {
    renderWithProviders(<MeditationHomeScreen />);

    // Full-bleed iris field header (Direction B room), not the plain hero header.
    expect(screen.getByTestId("module-field-gradient")).toBeTruthy();
    // The root carries the iris room re-pour; a wrong or missing room fails here.
    expect(screen.UNSAFE_getByType(SafeAreaView).props.style).toEqual(roomVariables("iris").light);
  });

  it("keeps the room poured while preferences are still loading", () => {
    mockUseUserPreferences.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<MeditationHomeScreen />);

    // The loading return is its own SafeAreaView - without the pour the iris room
    // drops out for as long as preferences take to arrive.
    expect(screen.UNSAFE_getByType(SafeAreaView).props.style).toEqual(roomVariables("iris").light);
    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
  });

  it("omits the subline until history has actually loaded", () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "no sessions" there would erase a returning user's real history (#320).
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

  it("converts the module accents to iris while leaving control colours alone", () => {
    setSessions([session()]);

    renderWithProviders(<MeditationHomeScreen />);

    // The room re-pours surface tokens but not `primary`, so these accents only
    // reach iris by being converted.
    const badge = screen.getByText("Stage 3");
    expect(badge.props.className).toContain("text-iris");
    expect(screen.getByText("All sessions").props.className).toContain("text-iris");
  });
});
