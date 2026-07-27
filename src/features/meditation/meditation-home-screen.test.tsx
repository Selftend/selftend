import { screen } from "@testing-library/react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MeditationHomeScreen from "@/src/features/meditation/meditation-home-screen";
import {
  useMeditationMedianMinutes,
  useMeditationProgramState,
  useMeditationSessionCount,
  useMeditationSessions,
} from "@/src/features/meditation/queries";
import { useUserPreferences } from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectRoomPour } from "@/test/room-pour";

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
  useMeditationProgramState: jest.fn(),
  useMeditationSessions: jest.fn(),
  useMeditationSessionCount: jest.fn(),
  useMeditationMedianMinutes: jest.fn(),
  useUpsertMeditationProgramState: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useStagePracticeNotes: jest.fn(() => ({ data: undefined })),
  useSaveStagePracticeNote: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
  useUpdateUserPreferences: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useUpdateShownButtonTours: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

// The sit itself is not what this suite is about, and the widget reaches for
// AsyncStorage and native audio on mount.
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

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseMeditationSessions = useMeditationSessions as jest.MockedFunction<
  typeof useMeditationSessions
>;
const mockUseMeditationSessionCount = useMeditationSessionCount as jest.MockedFunction<
  typeof useMeditationSessionCount
>;
const mockUseMeditationProgramState = useMeditationProgramState as jest.MockedFunction<
  typeof useMeditationProgramState
>;
const mockUseMeditationMedianMinutes = useMeditationMedianMinutes as jest.MockedFunction<
  typeof useMeditationMedianMinutes
>;

const session = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  userId: "user-1",
  durationMinutes: 20,
  // Deliberately not the current stage (3), so the hero stat and the row's
  // stage badge stay distinguishable by text.
  stageAtSession: 2,
  completedAt: "2026-05-28T10:00:00Z",
  createdAt: "2026-05-28T10:00:00Z",
  ...overrides,
});

const setSessions = (data: unknown) =>
  mockUseMeditationSessions.mockReturnValue({ data } as unknown as ReturnType<
    typeof useMeditationSessions
  >);

const setServerMedian = (data: number | null | undefined) =>
  mockUseMeditationMedianMinutes.mockReturnValue({ data } as unknown as ReturnType<
    typeof useMeditationMedianMinutes
  >);

describe("MeditationHomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserPreferences.mockReturnValue({
      data: { enabledModules: ["meditation"] },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
    mockUseMeditationProgramState.mockReturnValue({
      data: { currentStage: 3, preferredDurationMinutes: 15 },
    } as unknown as ReturnType<typeof useMeditationProgramState>);
    mockUseMeditationSessionCount.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useMeditationSessionCount
    >);
    setServerMedian(undefined);
    setSessions(undefined);
  });

  it("renders the header title, description, and the three stats", () => {
    setSessions([session(), session({ id: "s2", durationMinutes: 10 })]);
    mockUseMeditationSessionCount.mockReturnValue({ data: 2 } as unknown as ReturnType<
      typeof useMeditationSessionCount
    >);

    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.getByRole("heading", { name: "Meditation" })).toBeTruthy();
    expect(
      screen.getByText("Train steady attention and clear awareness, one sit at a time."),
    ).toBeTruthy();
    expect(screen.getByText("Stage 3")).toBeTruthy();
    expect(screen.getByText("2 sessions")).toBeTruthy();
    // Median of a 20 and a 10 minute sit.
    expect(screen.getByText("15 min")).toBeTruthy();
    expect(screen.getByText("Median")).toBeTruthy();
  });

  it("shows the lifetime median, not the median of the newest 200 sits", () => {
    // A daily meditator passes the 200-session list cap in under seven months. Here the
    // newest 200 sits alternate 4 and 6 minutes, so a median taken over the capped list
    // is 5; the user's real history is dominated by longer earlier sits, so the lifetime
    // median is 25. Nothing in the "Median" label says "recent" (#337).
    // The two durations are chosen so that 5 appears nowhere else on screen - the recent
    // rows below render their own "{{count}} min" labels.
    setSessions(
      Array.from({ length: 200 }, (_, i) =>
        session({ id: `recent-${i}`, durationMinutes: i % 2 === 0 ? 4 : 6 }),
      ),
    );
    setServerMedian(25);

    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.getByText("25 min")).toBeTruthy();
    // The capped-list median, which is what the screen used to show.
    expect(screen.queryByText("5 min")).toBeNull();
  });

  it("falls back to the loaded sits until the server median arrives", () => {
    setSessions([session({ durationMinutes: 20 }), session({ id: "s2", durationMinutes: 10 })]);
    setServerMedian(undefined);

    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.getByText("15 min")).toBeTruthy();
  });

  it("renders a dash when the server reports no sits to take a median of", () => {
    // Null is "no sessions at all", which is not a zero-minute median.
    setSessions([]);
    setServerMedian(null);

    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.getByText("-")).toBeTruthy();
    expect(screen.getByText("Median")).toBeTruthy();
  });

  it("renders the iris room: field header and room pour", () => {
    renderWithProviders(<MeditationHomeScreen />);

    // Full-bleed iris field header (Direction B room), not the plain header.
    expect(screen.getByTestId("module-field-gradient")).toBeTruthy();
    // The root carries the iris room re-pour; a wrong or missing room fails here.
    expectRoomPour(screen.UNSAFE_getByType(SafeAreaView), "iris");
  });

  it("wears iris on the stage badge and the history link", () => {
    setSessions([session()]);

    renderWithProviders(<MeditationHomeScreen />);

    // Room accents follow the module hue; `primary` stays reserved for
    // interactive control states (buttons, selected chips).
    expect(screen.getByText("Stage 2").props.className).toContain("text-iris");
    expect(screen.getByText("All sessions").props.className).toContain("text-iris");
  });

  it("keeps the room poured on the loading return", () => {
    mockUseUserPreferences.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<MeditationHomeScreen />);

    // Without this the iris room drops out while preferences resolve and snaps
    // in afterwards - the defect grounding shipped and had to fix.
    expectRoomPour(screen.UNSAFE_getByType(SafeAreaView), "iris");
    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
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
    expect(screen.queryByText(/^Last · /)).toBeNull();
  });

  it("shows the last-session subline when sessions exist", () => {
    setSessions([session()]);

    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.getByText(/^Last · /)).toBeTruthy();
    expect(screen.queryByText("No sessions logged yet")).toBeNull();
  });

  it("derives the subline from the latest session, not the list order", () => {
    setSessions([
      session({ id: "older", completedAt: "2026-05-20T10:00:00Z" }),
      session({ id: "newest", completedAt: "2026-06-02T10:00:00Z" }),
    ]);

    renderWithProviders(<MeditationHomeScreen />);

    const subline = screen.getByText(/^Last · /).props.children as string;
    expect(subline).toContain(new Date("2026-06-02T10:00:00Z").toLocaleString("en"));
  });
});
