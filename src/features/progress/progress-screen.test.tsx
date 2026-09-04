import { screen } from "@testing-library/react-native";
import { ScrollView } from "react-native";
import { Svg } from "react-native-svg";

import ProgressScreen from "@/src/features/progress/progress-screen";
import { useMoodScorePoints } from "@/src/features/mood/queries";
import { HOME_COLUMN } from "@/src/lib/layout";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

// Mocked so the mood trend's absence can be asserted on the MECHANISM rather
// than on its copy - see the first test.
jest.mock("@/src/features/mood/queries", () => ({
  useMoodScorePoints: jest.fn(),
}));

const mockUseMoodScorePoints = useMoodScorePoints as jest.MockedFunction<typeof useMoodScorePoints>;

describe("ProgressScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("is named Looking back and draws no mood trend (#1826)", () => {
    renderWithProviders(<ProgressScreen />);

    expect(screen.getByText("Looking back")).toBeTruthy();

    /*
     * The mood trend's removal is asserted on what the screen DOES, not on the
     * strings it stopped rendering. `queryByText("Log a mood to start your
     * trend.")` was the old guard here, and deleting that key from the locales
     * turns it green for good - it would pass just as happily against a screen
     * that had the whole chart back under different copy. These two survive a
     * revert: put the card back and the query fires and the chart mounts.
     */
    expect(mockUseMoodScorePoints).not.toHaveBeenCalled();
    expect(screen.UNSAFE_queryByType(Svg)).toBeNull();

    // No range controls - and the time view landing on this screen next (#1906)
    // may not bring any either: a changeable window invites comparison between
    // windows, which is the denominator #1834 removed.
    expect(screen.queryByText("7d")).toBeNull();
    expect(screen.queryByText("30d")).toBeNull();
    expect(screen.queryByText("90d")).toBeNull();
    expect(screen.queryByText("Custom")).toBeNull();
  });

  it("renders the same with no data at all - it reads nothing to render (#1840)", () => {
    // There is no loading state and no empty state left on this screen, because
    // there is nothing to load. A person who has recorded nothing sees exactly
    // what a person with a thousand records sees.
    renderWithProviders(<ProgressScreen />);

    expect(screen.getByText("Looking back")).toBeTruthy();
    expect(screen.getByText("Reflection prompt")).toBeTruthy();
    expect(
      screen.getByText("Looking back over this stretch, what stands out to you?"),
    ).toBeTruthy();
  });

  it("pins one reflection prompt - the same question on every weekday (#1665)", () => {
    // A Sunday and a Wednesday: the retired weekday-modulo pick rendered a
    // different question on each (#1665) - content that changes daily on a rule
    // the user cannot see is a schedule, not a library. The Sunday case is the
    // one that went red against the old code (index 0 was a different string);
    // the retired strings are gone from every locale, so there is nothing to
    // assert absent.
    for (const now of ["2026-09-06T12:00:00", "2026-09-09T12:00:00"]) {
      jest.useFakeTimers({ now: new Date(now) });
      try {
        const view = renderWithProviders(<ProgressScreen />);

        expect(
          screen.getByText("Looking back over this stretch, what stands out to you?"),
        ).toBeTruthy();

        view.unmount();
      } finally {
        jest.useRealTimers();
      }
    }
  });

  /**
   * #1721: `/progress` ran edge-to-edge on a wide browser while Settings and
   * Notifications sat in a 672px column. The column is `HOME_COLUMN` on the
   * PADDED scroll box, the way `/support` applies it - 720 outer minus the
   * `p-6` gutters is the 672 the siblings show. Jest does not run NativeWind's
   * compiler, so the class prop is asserted as tokens (className never becomes
   * style here); the padding is pinned on the SAME element because a column
   * placed inside the gutters would read 720, not 672.
   */
  it("takes the 672px content column of Settings and Notifications (#1721)", () => {
    renderWithProviders(<ProgressScreen />);

    const tokens = String(
      screen.UNSAFE_getByType(ScrollView).props.contentContainerClassName,
    ).split(/\s+/);

    for (const token of HOME_COLUMN.split(/\s+/)) {
      expect(tokens).toContain(token);
    }
    expect(tokens).toContain("p-6");
  });
});
