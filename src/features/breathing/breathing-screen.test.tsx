import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BreathingScreen from "@/app/(app)/tools/breathing/index";
import { useBreathingExercises } from "@/src/features/breathing/exercises-queries";
import {
  useBreathingSessionCount,
  useBreathingSessions,
  useBreathingTotalMinutes,
} from "@/src/features/breathing/queries";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";

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
  useBreathingSessionCount: jest.fn(),
  useBreathingTotalMinutes: jest.fn(),
}));

jest.mock("@/src/features/breathing/exercises-queries", () => ({
  useBreathingExercises: jest.fn(),
}));

jest.mock("@/src/components/app/help-sheet", () => ({
  HelpSheet: () => null,
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));
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
const mockUseCount = useBreathingSessionCount as jest.MockedFunction<
  typeof useBreathingSessionCount
>;
const mockUseMinutes = useBreathingTotalMinutes as jest.MockedFunction<
  typeof useBreathingTotalMinutes
>;

function session(over: Partial<Record<string, unknown>> = {}) {
  return {
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
    ...over,
  };
}

function setSessions(data: unknown) {
  mockUseBreathingSessions.mockReturnValue({ data } as unknown as ReturnType<
    typeof useBreathingSessions
  >);
}

describe("Breathing overview (4a)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSessions(undefined);
    mockUseBreathingExercises.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useBreathingExercises
    >);
    mockUseCount.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useBreathingSessionCount
    >);
    mockUseMinutes.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useBreathingTotalMinutes
    >);
  });

  it("renders the header title and tagline", () => {
    renderWithProviders(<BreathingScreen />);
    expect(screen.getByRole("heading", { name: "Breathing" })).toBeTruthy();
    expect(
      screen.getByText("Short guided patterns to calm your nervous system right now."),
    ).toBeTruthy();
  });

  it("splits each stat into a count and its noun", () => {
    mockUseCount.mockReturnValue({ data: 6 } as unknown as ReturnType<
      typeof useBreathingSessionCount
    >);
    mockUseMinutes.mockReturnValue({ data: 21 } as unknown as ReturnType<
      typeof useBreathingTotalMinutes
    >);
    renderWithProviders(<BreathingScreen />);

    // The header nests the value in its own Text inside the stat's Text, so the
    // number can carry the foreground ink while the noun stays muted. The inner
    // node is the number alone; the outer reads as the whole stat.
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByText("21")).toBeTruthy();
    expect(screen.getByText("6 sessions")).toBeTruthy();
    expect(screen.getByText("21 minutes")).toBeTruthy();
  });

  it("takes both stats from the server aggregates, not the capped list", () => {
    // One row in the window, but the account has 300 sessions and 900 minutes.
    // Reducing the list would print 1 and 2 here.
    setSessions([session()]);
    mockUseCount.mockReturnValue({ data: 300 } as unknown as ReturnType<
      typeof useBreathingSessionCount
    >);
    mockUseMinutes.mockReturnValue({ data: 900 } as unknown as ReturnType<
      typeof useBreathingTotalMinutes
    >);
    renderWithProviders(<BreathingScreen />);

    expect(screen.getByText("300")).toBeTruthy();
    expect(screen.getByText("900")).toBeTruthy();
  });

  it("lists the built-in patterns as rows with their phase counts", () => {
    renderWithProviders(<BreathingScreen />);
    expect(screen.getByText("Box breathing")).toBeTruthy();
    expect(screen.getByText("4 · 4 · 4 · 4s")).toBeTruthy();
    // 4-7-8 has a zero fourth phase; it must not render as a trailing "· 0".
    expect(screen.getByText("4 · 7 · 8s")).toBeTruthy();
  });

  it("gives every pattern row a colour dot", () => {
    mockUseBreathingExercises.mockReturnValue({
      data: [
        {
          id: "e1",
          userId: "user-1",
          name: "Evening wind-down",
          inhaleSeconds: 6,
          holdInSeconds: 0,
          exhaleSeconds: 8,
          holdOutSeconds: 0,
          cycles: 6,
          color: "iris",
          createdAt: "2026-05-01T00:00:00Z",
          updatedAt: "2026-05-01T00:00:00Z",
        },
      ],
    } as unknown as ReturnType<typeof useBreathingExercises>);

    renderWithProviders(<BreathingScreen />);

    // Three built-ins plus the custom pattern, each with a dot.
    expect(screen.getAllByTestId("breathing-pattern-dot")).toHaveLength(4);
    expect(screen.getByText("Evening wind-down")).toBeTruthy();
    expect(screen.getByText("6 · 8s")).toBeTruthy();
  });

  it("keeps the play arrow neutral - only the dot carries the pattern colour", () => {
    renderWithProviders(<BreathingScreen />);

    // The dot proves the probe works: its chip ink is a computed value, so it
    // survives into the flattened style even in jest (where classNames don't).
    const dot = screen.getAllByTestId("breathing-pattern-dot")[0];
    expect(StyleSheet.flatten(dot.props.style)?.backgroundColor).toBeTruthy();

    const glyphs = screen.getAllByTestId("breathing-pattern-play", {
      includeHiddenElements: true,
    });
    expect(glyphs).toHaveLength(3);
    for (const glyph of glyphs) {
      // A per-pattern tint would arrive the same way - a computed
      // `style.color` from the chip recipe. The neutral rides a theme class,
      // which jest cannot see - the absence of a style colour is the signal.
      expect(StyleSheet.flatten(glyph.props.style)?.color).toBeUndefined();
    }
  });

  it("starts a pattern in one tap, carrying the pattern id", () => {
    renderWithProviders(<BreathingScreen />);
    fireEvent.press(screen.getByLabelText("Start Box breathing"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/tools/breathing/session",
      params: { pattern: "box-breathing" },
    });
  });

  it("links to the new-pattern screen from the section header", () => {
    renderWithProviders(<BreathingScreen />);
    fireEvent.press(screen.getByLabelText("New pattern"));
    expect(router.push).toHaveBeenCalledWith("/tools/breathing/new");
  });

  it("caps recent sessions at five and defers the rest to the all-sessions screen", () => {
    setSessions(
      Array.from({ length: 9 }, (_, i) =>
        session({ id: `s${i}`, completedAt: `2026-05-2${i}T10:00:00Z` }),
      ),
    );
    renderWithProviders(<BreathingScreen />);

    // Five rows, each showing "6 cycles" - not nine, and no "Load 5 more".
    expect(screen.getAllByText("6 cycles")).toHaveLength(5);
    expect(screen.queryByText(/Load \d+ more/)).toBeNull();

    fireEvent.press(screen.getByRole("link", { name: "Show all sessions" }));
    expect(router.push).toHaveBeenCalledWith("/tools/breathing/history");
  });

  it("renders a session row with its pattern, cycles and elapsed time", () => {
    setSessions([session()]);
    renderWithProviders(<BreathingScreen />);
    expect(screen.getByText("6 cycles")).toBeTruthy();
    expect(screen.getByText("1:36")).toBeTruthy(); // formatClock(96)
  });

  it("renders the aqua room and the never-logged stat once history has loaded", () => {
    setSessions([]);
    renderWithProviders(<BreathingScreen />);

    // The root carries the aqua room re-pour; a wrong or missing room fails here.
    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
    expect(screen.getByText("no sessions yet")).toBeTruthy();
  });

  it("omits the last stat until history has actually loaded", () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "no sessions" there would erase a returning user's real history.
    renderWithProviders(<BreathingScreen />);
    expect(screen.queryByText("no sessions yet")).toBeNull();
    expect(screen.queryByText(/^last /)).toBeNull();
  });

  it("omits the last stat while the custom patterns are still loading", () => {
    // The sessions query is enabled before `customExercises` arrives, so it first
    // resolves against the built-in patterns alone. A user whose only history is
    // custom patterns would otherwise see a loaded-but-empty list read as "never".
    setSessions([]);
    mockUseBreathingExercises.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useBreathingExercises
    >);
    renderWithProviders(<BreathingScreen />);
    expect(screen.queryByText("no sessions yet")).toBeNull();
  });

  it("omits the last stat when the built-in-only result would be stale", () => {
    // The nonempty half of the same race. The built-in-only result is not merely
    // incomplete - it can be *wrong*: if this user's newest session is a custom
    // pattern, the built-in session below is older, and billing it as "last"
    // shows a time that is about to change. Nothing is better than stale.
    setSessions([session()]);
    mockUseBreathingExercises.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useBreathingExercises
    >);
    renderWithProviders(<BreathingScreen />);

    expect(screen.queryByText(/^last /)).toBeNull();
    expect(screen.queryByText("no sessions yet")).toBeNull();
  });

  it("shows the last stat when sessions exist", () => {
    setSessions([session()]);
    renderWithProviders(<BreathingScreen />);
    expect(screen.getByText(/^last /)).toBeTruthy();
    expect(screen.queryByText("no sessions yet")).toBeNull();
  });

  it("opens the help sheet when the help button is pressed", () => {
    renderWithProviders(<BreathingScreen />);
    const helpButton = screen.getByLabelText("About breathing");
    fireEvent.press(helpButton);
    expect(helpButton).toBeTruthy();
  });
});
