import { fireEvent, screen, within } from "@testing-library/react-native";
import { ScrollView } from "react-native";
import { Svg } from "react-native-svg";
import { router } from "expo-router";

import ProgressScreen from "@/src/features/progress/progress-screen";
import { useMoodScorePoints } from "@/src/features/mood/queries";
import { useRecordDays } from "@/src/features/progress/queries";
import { HOME_COLUMN } from "@/src/lib/layout";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { expectEscapeReturnsTo } from "@/test/escape-round-trip";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * Mutable, not a hardcoded `"/progress"`: the round-trip test below has to move
 * the test to the destination, and a frozen pathname would also keep the Origin
 * assertion passing if this screen's route ever moved into a group or was
 * renamed - the invisible failure `escape-origin.ts` warns about.
 */
let mockPathname = "/progress";

// `ScreenEscape` and `ScreenBreadcrumb` inside `ScreenHeader` are the only other
// consumers here, and between them they use exactly `router.push`,
// `router.replace` and `usePathname`.
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

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

// The screen's one query (#1906). Mocked so the band's three states can be set
// up from here; the band's own behaviour is `record-band-card.test.tsx`.
jest.mock("@/src/features/progress/queries", () => ({
  useRecordDays: jest.fn(),
}));

const mockUseMoodScorePoints = useMoodScorePoints as jest.MockedFunction<typeof useMoodScorePoints>;
const mockUseRecordDays = useRecordDays as jest.MockedFunction<typeof useRecordDays>;

function recordDays(data: string[] | undefined) {
  mockUseRecordDays.mockReturnValue({ data } as unknown as ReturnType<typeof useRecordDays>);
}

describe("ProgressScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Both are cross-test state: the round-trip test leaves the pathname at the
    // destination, and a consumed-or-not Origin would leak into the next case.
    mockPathname = "/progress";
    useNavigationOriginStore.setState({ pending: null });
    // Default: nothing recorded. Cases that need the band say so.
    recordDays([]);
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

    // No range controls, and #1906's band brought none either: a changeable
    // window invites comparison between windows, which is the denominator
    // #1834 removed. Asserted here at SCREEN level, so a control added beside
    // the band rather than inside it still fails.
    expect(screen.queryByText("7d")).toBeNull();
    expect(screen.queryByText("30d")).toBeNull();
    expect(screen.queryByText("90d")).toBeNull();
    expect(screen.queryByText("Custom")).toBeNull();
  });

  /**
   * The band's placement and its wiring to the one query (#1906). The three
   * bodies and everything they must not contain are
   * `record-band-card.test.tsx`; what is asserted here is that this screen puts
   * the card between the header block and the prompt, and feeds it the viewer's
   * days rather than a window.
   */
  it("puts the band between the header and the prompt, fed by the record-days query", () => {
    recordDays(["2026-07-01", "2026-09-01"]);
    renderWithProviders(<ProgressScreen />);

    expect(mockUseRecordDays).toHaveBeenCalledWith("user-1");
    expect(screen.getByText("Your days")).toBeTruthy();

    // Order on screen: description, band title, prompt title, door title.
    const order = screen
      .getAllByText(
        /Your record over time, and a question to sit with\.|Your days|Reflection prompt|Your recovery plan/,
      )
      .map((node) => node.props.children);

    expect(order).toEqual([
      "Your record over time, and a question to sit with.",
      "Your days",
      "Reflection prompt",
      "Your recovery plan",
    ]);
  });

  /**
   * ☠️ **The band is the only thing on this screen that varies, and it varies on
   * the RECORD - never on the person.** Guest and registered are the same:
   * `useRecordDays` takes the session's user id, and a guest has a real one.
   * **No sign-in offer on any state** - conversion is invited from the user
   * menu, never from a surface someone is reading (#1807).
   */
  it("offers no sign-in from any band state, guest or registered", () => {
    for (const days of [[], ["2026-09-04"], ["2026-07-01", "2026-09-01"]]) {
      recordDays(days);
      const view = renderWithProviders(<ProgressScreen />);

      expect(screen.queryByText(/sign in|sign up|create an account|create account/i)).toBeNull();

      view.unmount();
    }
  });

  it("renders the reflection prompt card", () => {
    // The prompt is identical in all three of the band's states - it is not
    // one of the bodies that varies - so the default empty record set up above
    // is as good as any other.
    renderWithProviders(<ProgressScreen />);

    expect(screen.getByText("Reflection prompt")).toBeTruthy();
    expect(
      screen.getByText("Looking back over this stretch, what stands out to you?"),
    ).toBeTruthy();
  });

  /**
   * The screen's only door (#1905, from #1840 decision 5).
   *
   * ☠️ **It renders on every state, and there is no state here to condition it
   * on.** #1833 found exactly one cross-technique review object in the
   * literature - the end-of-therapy blueprint - and it survived that research
   * precisely because it is *written*, not computed. So the door is at its most
   * useful when the record is empty, and hiding it at zero would make its
   * presence a function of the record: the reactivity #1826 warns about,
   * pointed at a door instead of a number. The `recordDays([])` default set up
   * above is the emptiest state the screen has, which is exactly where the
   * unconditional assertion is worth making.
   */
  it("opens the recovery plan, with nothing on the screen to read (#1905)", () => {
    renderWithProviders(<ProgressScreen />);

    expect(screen.getByText("Your recovery plan")).toBeTruthy();
    expect(screen.getByText("What you wrote about what helps.")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Your recovery plan" }));

    expect(router.push).toHaveBeenCalledWith("/modules/cbt/recovery");
  });

  /**
   * ⚠️ On the STORE, not on `router.push`: `usePushWithOrigin` pushes *through*
   * `router.push`, so the assertion above passes identically whether or not the
   * door records where it was pressed from.
   *
   * It has to record. `/modules/cbt/recovery` climbs to `/modules/cbt`, so
   * arriving from here with no Origin leaves the recovery screen offering "Up"
   * into a module the person was not in - the #1160 symptom the Origin rule
   * exists for, and this door is a cross-subtree jump by construction.
   */
  it("records Looking back as the Origin, so the way back is not into CBT (#1905)", () => {
    useNavigationOriginStore.setState({ pending: null });
    renderWithProviders(<ProgressScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Your recovery plan" }));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/progress",
      forPathname: "/modules/cbt/recovery",
    });
  });

  /**
   * ☠️ **A door, not a copy** - the criterion that keeps this card from becoming
   * `RecoveryTimelineCard` by increments. That card states *per tool, first use
   * plus a lifetime count*; this screen's unit is the day, and #1840 cut the
   * spanning scalar precisely so no surface here reads a number back. The
   * moment this card previews the plan's contents it stops being a door and
   * starts being the aggregate the map removed.
   */
  it("previews nothing of the plan it opens - no timeline, no count (#1905)", () => {
    renderWithProviders(<ProgressScreen />);

    /*
     * ☠️ The first draft of this test asserted `/first used/i` absent, and NO
     * STRING IN EITHER LOCALE CONTAINS IT - the phrase was invented rather than
     * read off `cbt:recovery.timeline`, so hoisting the card verbatim would
     * have left it green. These are the card's real strings.
     */
    expect(screen.queryByText("Journey timeline")).toBeNull();
    expect(screen.queryByText("When each part of your CBT toolkit first showed up.")).toBeNull();

    /*
     * And the one that survives a copy rewrite: the door computes nothing, so
     * no digit belongs inside it. Language- and wording-independent, which the
     * two pinned strings above are not.
     *
     * ⚠️ **SCOPED TO THE DOOR, not the screen.** It was screen-wide when #1905
     * shipped, which was true only while this screen rendered nothing else -
     * #1906's band draws month ticks, and the leftmost names a YEAR. A
     * screen-wide digit ban would have made a correct band look like a
     * regression in the door's own test, and the tempting fix would have been
     * to delete the assertion rather than aim it.
     *
     * ⚠️ It sees rendered `Text` only. A count reaching an `accessibilityLabel`
     * would pass here - and `AccessibleCardLink` builds its label from `title`,
     * so that is the hole to watch if this door ever takes a computed title.
     */
    const door = screen.getByRole("button", { name: "Your recovery plan" });
    expect(within(door).queryByText(/\d/)).toBeNull();
  });

  /**
   * The other half of the Origin rule, through the real route map (#1261 R2/R5).
   *
   * Recording is the cheap half. The half the user feels is this one: arrive at
   * the recovery plan and the Escape has to *name* Looking back and go back to
   * it, rather than climbing to `/modules/cbt` - where that screen's own Up
   * leads, and where this person has never been.
   *
   * ⚠️ The departing screen is unmounted first. The Origin is consumed on
   * mount, and a leftover tree lets `getByText` match a node from a screen the
   * user has already left.
   */
  it("lets the Escape on the recovery plan return to Looking back, named (#1905)", () => {
    const session = renderWithProviders(<ProgressScreen />);
    fireEvent.press(screen.getByRole("button", { name: "Your recovery plan" }));
    session.unmount();

    expectEscapeReturnsTo({
      arriveAt: (pathname) => {
        mockPathname = pathname;
      },
      destination: "/modules/cbt/recovery",
      name: "Looking back",
      origin: "/progress",
    });
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
