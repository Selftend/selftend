import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { Pressable, ScrollView } from "react-native";
import { Svg } from "react-native-svg";
import { router } from "expo-router";

import ProgressScreen from "@/src/features/progress/progress-screen";
import { useMoodScorePoints } from "@/src/features/mood/queries";
import * as progressRepo from "@/src/features/progress/repository";
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

/*
 * The band's data layer runs for real - only the network edge is mocked - so
 * these tests exercise `useRecordDays` and `buildRecordBand` as the screen
 * actually assembles them, and a state that stops reaching the card shows up
 * here rather than passing against a stubbed hook.
 */
jest.mock("@/src/features/progress/repository", () => ({
  listRecordDays: jest.fn(),
  viewerOffsetMinutes: jest.fn(() => 330),
}));

const mockUseMoodScorePoints = useMoodScorePoints as jest.MockedFunction<typeof useMoodScorePoints>;
const mockListRecordDays = jest.mocked(progressRepo.listRecordDays);

describe("ProgressScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListRecordDays.mockResolvedValue([]);
    // Both are cross-test state: the round-trip test leaves the pathname at the
    // destination, and a consumed-or-not Origin would leak into the next case.
    mockPathname = "/progress";
    useNavigationOriginStore.setState({ pending: null });
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

  it("renders the reflection prompt card", () => {
    // Deliberately NOT titled "with no data": this screen reads nothing, so
    // there is no data condition for a test to set up, and a test claiming to
    // pin one would be describing a state it never establishes. The three
    // states of the time view are #1906's, where a query exists to vary.
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
   * pointed at a door instead of a number. This screen reads nothing at all
   * (`useMoodScorePoints` is asserted uncalled above), so "with no data" is the
   * only state it has - which is exactly what makes the unconditional
   * assertion meaningful rather than a setup nobody established.
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
     * And the one that survives a copy rewrite: this screen computes nothing,
     * so NO digit belongs on it at all. Language- and wording-independent,
     * which the two pinned strings above are not.
     *
     * ⚠️ It sees rendered `Text` only. A count reaching an `accessibilityLabel`
     * would pass here - and `AccessibleCardLink` builds its label from `title`,
     * so that is the hole to watch if this door ever takes a computed title.
     */
    expect(screen.queryByText(/\d/)).toBeNull();
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

  /**
   * "Your days" (#1906) - the card that makes this screen worth opening. One
   * inert mark for each day the person recorded anything, anywhere in the app.
   *
   * ☠️ Only the card's BODY changes across the three states. The header, the
   * prompt and the recovery-plan door render identically in all three, which is
   * what keeps an empty record from reading as a broken screen.
   */
  describe("the Your days band", () => {
    const NOW = new Date("2026-09-04T12:00:00");

    async function renderAt(dayKeys: string[]) {
      mockListRecordDays.mockResolvedValue(dayKeys);
      jest.useFakeTimers({ now: NOW });
      const view = renderWithProviders(<ProgressScreen />);
      /*
       * ⚠️ The settle point has to be something only a SETTLED state renders.
       * The card's title and description render in every state including
       * `pending`, so waiting on either returns immediately and every
       * assertion below then runs against the loading screen - which passes
       * the negative ones for the wrong reason.
       */
      await waitFor(() => {
        const body =
          screen.queryByTestId("record-band") ??
          screen.queryByText("Days you record anything will appear here.") ??
          screen.queryByText("Your record starts here.");
        expect(body).not.toBeNull();
      });
      return view;
    }

    afterEach(() => {
      jest.useRealTimers();
    });

    it("draws one mark per recorded day and nothing for the days between", async () => {
      await renderAt(["2026-09-01", "2026-09-03"]);

      expect(screen.getAllByTestId("record-mark")).toHaveLength(2);
      // Four days of axis, two marks. A drawn empty day would promote absence to
      // a first-class mark - the lattice is the chain, not the calendar (#1834).
    });

    /**
     * ☠️ **The gate is SPAN, not count** - and these two cases invert the count
     * to prove it. Two recorded days ending today draw no band; ONE recorded day
     * three days back does. A gate that counted marks cannot pass both.
     */
    it("draws the band from a single record three days back", async () => {
      await renderAt(["2026-09-01"]);

      expect(screen.getByTestId("record-band")).toBeTruthy();
      expect(screen.queryByText("Your record starts here.")).toBeNull();
    });

    it("says the record starts here when two days of records leave no axis", async () => {
      await renderAt(["2026-09-03", "2026-09-04"]);

      expect(screen.getByText("Your record starts here.")).toBeTruthy();
      expect(screen.queryByTestId("record-band")).toBeNull();
      // ☠️ Its own string: "nothing here yet" would be a lie about the person's
      // own record, and a count would be the count line refused below.
      expect(screen.queryByText("Days you record anything will appear here.")).toBeNull();
    });

    it("says days will appear here only when there is no record at all", async () => {
      await renderAt([]);

      expect(screen.getByText("Days you record anything will appear here.")).toBeTruthy();
      expect(screen.queryByTestId("record-band")).toBeNull();
    });

    /**
     * ☠️ **The empty state points nowhere.** Home's zero-state ships three
     * buttons because an empty dashboard is a configuration the person has not
     * done; an empty record is not a defect and has nothing to repair. A door
     * here would say *go and use a tool so this fills in*, making the chart the
     * reason to practise - §12's inversion.
     *
     * The recovery-plan door is the screen's, not the card's, and it is
     * asserted present above at exactly this state.
     */
    it("offers nothing to press out of an empty record", async () => {
      await renderAt([]);

      /*
       * ⚠️ Scoped to the CARD, and asserted as "no pressable at all" rather
       * than as the absence of one label. Naming a string would only rule out
       * the door somebody happened to imagine: a real "Log a check-in" button
       * added here would sail past it while the test kept its name.
       */
      const card = within(screen.getByTestId("your-days-card"));
      expect(card.queryAllByRole("button")).toHaveLength(0);
      expect(card.UNSAFE_queryAllByType(Pressable)).toHaveLength(0);

      // The recovery-plan door is the SCREEN's and renders at every state - it
      // is most useful when there is nothing to look back on yet.
      expect(screen.getByRole("button", { name: "Your recovery plan" })).toBeTruthy();
    });

    /**
     * ☠️ **A failed read is not an empty record.** `MoodHeatmap` shows its empty
     * string when its query fails; here that would be the exact false absence
     * this whole card exists to avoid. Query errors reach Sentry through the
     * shared `QueryCache.onError` but raise no toast - only mutations do - so
     * without this branch the card sits titled and blank for good.
     */
    it("says the read failed rather than claiming the record is empty", async () => {
      jest.useFakeTimers({ now: NOW });
      mockListRecordDays.mockRejectedValue(new Error("rpc down"));

      renderWithProviders(<ProgressScreen />);

      expect(await screen.findByText("Your days could not be loaded just now.")).toBeTruthy();
      expect(screen.queryByText("Days you record anything will appear here.")).toBeNull();
      expect(screen.queryByTestId("record-band")).toBeNull();
    });

    /**
     * ☠️ **The marks are inert - no press handler, no door.** #1840's stated
     * reason this screen is safe is that it holds no content: "you cannot
     * re-read a thought record from a dot." A pressable dot is what would put
     * that back, and a dated-entry door is what #1840 explicitly forbids.
     */
    it("draws marks nobody can press", async () => {
      await renderAt(["2026-09-01", "2026-09-03"]);
      const band = within(screen.getByTestId("record-band"));

      expect(band.UNSAFE_queryAllByType(Pressable)).toHaveLength(0);
      for (const mark of screen.getAllByTestId("record-mark")) {
        expect(mark.props.onPress).toBeUndefined();
      }
    });

    /**
     * ☠️ **No count line, no caption under the band.** #1840 cut the spanning
     * scalar; a caption restores it by the back door, in the exact
     * numerator-over-drawn-denominator form #1834 warned about.
     *
     * The assertion is not "no digits" - the axis is dated, and a year is a
     * date rather than a figure. It is that the ONLY digits on the whole screen
     * are the axis labels themselves, so any count added anywhere shows up here
     * whatever its wording or language.
     */
    it("puts no figure anywhere on the screen but the dates on its axis", async () => {
      await renderAt(["2026-03-12", "2026-09-01"]);

      const withDigits = screen.queryAllByText(/\d/).map((node) => node.props.children);
      expect(withDigits).toEqual(["Mar 2026"]);
    });

    /**
     * ☠️ **No range control.** A changeable window invites between-window
     * comparison and re-supplies the denominator #1834 removed. The axis is
     * anchored at the first record and runs to today - all time, always.
     */
    it("gives the axis no window to change", async () => {
      await renderAt(["2026-03-12", "2026-09-01"]);

      for (const label of ["7d", "30d", "90d", "All", "Custom"]) {
        expect(screen.queryByText(label)).toBeNull();
      }
      // The leftmost tick names the month and year the record opens in, which is
      // the axis stating its own extent rather than offering to change it.
      expect(screen.getByText("Mar 2026")).toBeTruthy();
    });

    /**
     * ☠️ **One summary node, labelled by EXTENT ONLY.** An a11y-only count was
     * refused: handing a screen-reader user the figure that was cut for being
     * harmful is worse than the gap. Stated plainly - a screen-reader user gets
     * almost nothing from this screen. That is a known cost of the shape,
     * recorded as such, not a defect to patch with a number.
     */
    it("gives a screen reader one node, named by the two ends of the axis", async () => {
      await renderAt(["2026-03-12", "2026-09-01"]);

      const summaries = screen.getAllByLabelText(/Record timeline/);
      expect(summaries).toHaveLength(1);
      expect(summaries[0].props.accessibilityLabel).toBe(
        "Record timeline, March 12, 2026 to September 4, 2026.",
      );
    });

    /**
     * The band is a claim about the person's record, so it may not be made
     * before the answer is in. Rendering the empty line while the query is in
     * flight states "days you record anything will appear here" at someone with
     * a year of records - a false absence, on the one screen whose job is to
     * state the record truthfully.
     */
    it("says nothing about the record until the days have arrived", () => {
      jest.useFakeTimers({ now: NOW });
      mockListRecordDays.mockReturnValue(new Promise(() => {}));

      renderWithProviders(<ProgressScreen />);

      expect(screen.getByText("Your days")).toBeTruthy();
      expect(screen.queryByText("Days you record anything will appear here.")).toBeNull();
      expect(screen.queryByText("Your record starts here.")).toBeNull();
      expect(screen.queryByTestId("record-band")).toBeNull();
    });
  });
});
