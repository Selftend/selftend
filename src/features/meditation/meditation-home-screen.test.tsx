import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";

import MeditationHomeScreen from "@/src/features/meditation/meditation-home-screen";
import {
  useMeditationMedianMinutes,
  useMeditationMinutesWindow,
  useMeditationProgramState,
  useMeditationSessionCount,
  useMeditationSessions,
  useStagePracticeNotes,
  useUpsertMeditationProgramState,
} from "@/src/features/meditation/queries";
import {
  MINUTES_WINDOW_DAYS,
  minutesWindowFromIso,
} from "@/src/features/meditation/minutes-window";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { currentDateKey } from "@/src/utils/date";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    router: {
      push: jest.fn(),
      canGoBack: jest.fn(() => false),
    },
    useLocalSearchParams: () => ({}),
    usePathname: () => "/tools/meditation",
    // Actually runs its callback, as focus does: the "ends about" read-out reads
    // the clock there and would never appear under a no-op mock.
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationProgramState: jest.fn(),
  useMeditationSessions: jest.fn(),
  useMeditationSessionCount: jest.fn(),
  useMeditationMedianMinutes: jest.fn(),
  useMeditationMinutesWindow: jest.fn(),
  useUpsertMeditationProgramState: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useStagePracticeNotes: jest.fn(() => ({ data: undefined })),
  useSaveStagePracticeNote: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
  useUpdateUserPreferences: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useUpdateShownButtonTours: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/src/components/app/meditation-info-modal", () => ({ MeditationInfo: () => null }));
jest.mock("@/src/components/app/meditation-onboarding-modal", () => ({
  MeditationOnboarding: () => null,
}));
jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));
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
const mockUseMeditationMinutesWindow = useMeditationMinutesWindow as jest.MockedFunction<
  typeof useMeditationMinutesWindow
>;

const session = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  userId: "user-1",
  durationMinutes: 20,
  // Deliberately not the current stage (3), so the hero stat and the row's
  // stage badge stay distinguishable by text.
  stageAtSession: 2,
  completedAt: "2026-05-28T10:00:00Z",
  completedOffsetMinutes: null,
  dayKey: "2026-05-28",
  reflection: "",
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

const setMinutesWindow = (data: unknown) =>
  mockUseMeditationMinutesWindow.mockReturnValue({ data } as unknown as ReturnType<
    typeof useMeditationMinutesWindow
  >);

// The module mocks build a FRESH mutateAsync on every call, so a test that wants
// to assert on the write has to pin one. Re-pinned per test, after clearAllMocks.
const upsertProgramState = jest.fn();
const updatePreferences = jest.fn();

const setStoredPreferences = (extra: Record<string, unknown> = {}) =>
  mockUseUserPreferences.mockReturnValue({
    data: { enabledModules: ["meditation"], ...extra },
    isLoading: false,
  } as unknown as ReturnType<typeof useUserPreferences>);

describe("MeditationHomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    upsertProgramState.mockResolvedValue(undefined);
    updatePreferences.mockResolvedValue(undefined);
    (useUpsertMeditationProgramState as jest.Mock).mockReturnValue({
      mutateAsync: upsertProgramState,
      isPending: false,
    });
    (useUpdateUserPreferences as jest.Mock).mockReturnValue({
      mutateAsync: updatePreferences,
      isPending: false,
    });
    setStoredPreferences();
    mockUseMeditationProgramState.mockReturnValue({
      // The stored preference is where the length slider starts; the
      // no-chip-ever-drew-it case (15) has a test of its own below.
      data: { currentStage: 3, preferredDurationMinutes: 20 },
    } as unknown as ReturnType<typeof useMeditationProgramState>);
    mockUseMeditationSessionCount.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useMeditationSessionCount
    >);
    setServerMedian(undefined);
    setSessions(undefined);
    setMinutesWindow(undefined);
  });

  it("renders the header title, description, and a split count/noun stat run", () => {
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
    // The count is its own foreground-ink node and the noun is muted beside it,
    // which is what "24 sits" is in the design - not one baked string (#690).
    expect(screen.getByText("2 sits")).toBeTruthy();
    // Median of a 20 and a 10 minute sit.
    expect(screen.getByText("15 min typical")).toBeTruthy();
  });

  it("shows the lifetime median, not the median of the newest 200 sits", () => {
    // A daily meditator passes the 200-session list cap in under seven months. Here the
    // newest 200 sits alternate 4 and 6 minutes, so a median taken over the capped list
    // is 5; the user's real history is dominated by longer earlier sits, so the lifetime
    // median is 25. Nothing in the "typical" label says "recent" (#337).
    setSessions(
      Array.from({ length: 200 }, (_, i) =>
        session({ id: `recent-${i}`, durationMinutes: i % 2 === 0 ? 4 : 6 }),
      ),
    );
    setServerMedian(25);

    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.getByText("25 min typical")).toBeTruthy();
    // The capped-list median, which is what the screen used to show. Asserted on
    // the composed stat rather than the bare string, because "5 min" is also one
    // of the length buttons above.
    expect(screen.queryByText("5 min typical")).toBeNull();
  });

  it("falls back to the loaded sits until the server median arrives", () => {
    setSessions([session({ durationMinutes: 20 }), session({ id: "s2", durationMinutes: 10 })]);
    setServerMedian(undefined);

    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.getByText("15 min typical")).toBeTruthy();
  });

  it("meets a brand-new account with a stage rather than a row of zeros", () => {
    // `0 sits · - typical` is the row #735 took off the check-in overview. The
    // stage is different: it exists from the first second of an account.
    setSessions([]);
    setServerMedian(null);

    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.getByText("Stage 3")).toBeTruthy();
    expect(screen.queryByText("0 sits")).toBeNull();
    expect(screen.queryByText(/typical/)).toBeNull();
  });

  it("inks the stage badge and the all-sits link so they clear AA", () => {
    setSessions([session()]);

    renderWithProviders(<MeditationHomeScreen />);

    // The design fills both with `iris/0.1` under `hsl(var(--iris))` text, which
    // is the pattern #691 named a regression and #368 measured at 3.81:1.
    expect(screen.getByText("Stage 2").props.className).toContain("text-primary-ink");
    expect(screen.getByText("Show all sits").props.className).toContain("text-primary-ink");
  });

  it("omits the subline until history has actually loaded", () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "no sessions" there would erase a returning user's real history.
    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.queryByText("no sessions logged yet")).toBeNull();
    expect(screen.queryByText(/^last sat /)).toBeNull();
  });

  it("shows the never subline once an empty history has loaded", () => {
    setSessions([]);

    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.getByText("no sessions logged yet")).toBeTruthy();
    expect(screen.queryByText(/^last sat /)).toBeNull();
  });

  it("shows the last-session subline when sessions exist", () => {
    setSessions([session()]);

    renderWithProviders(<MeditationHomeScreen />);

    expect(screen.getByText(/^last sat /)).toBeTruthy();
    expect(screen.queryByText("no sessions logged yet")).toBeNull();
  });

  it("derives the subline from the latest session, not the list order", () => {
    setSessions([
      session({ id: "older", completedAt: "2026-05-20T10:00:00Z", dayKey: "2026-05-20" }),
      // Captured at UTC-11, where this instant is still June 1 - the subline
      // must date the sit by the captured frame, not the viewer's (#433 §3).
      session({
        id: "newest",
        completedAt: "2026-06-02T10:00:00Z",
        completedOffsetMinutes: -660,
        dayKey: "2026-06-01",
      }),
    ]);

    renderWithProviders(<MeditationHomeScreen />);

    // Matched on composed text: the subline is now a value-less item in the
    // header's inline stat run, so its Text has nested children (#733).
    // Compact date form (#870): an old sit in the current year reads `Jun 1`,
    // still dated by the captured frame — the -660 offset keeps this instant
    // on June 1, not the viewer's June 2.
    expect(screen.getByText(/^last sat .*Jun 1/)).toBeTruthy();
    expect(screen.queryByText(/May 20/)).toBeNull();
  });

  describe("today's sit", () => {
    // `5 min` can appear as both a length read-out and a bell spacing, so every
    // query here is scoped to the control it belongs to.
    const lengths = () => within(screen.getByTestId("sit-length-slider"));
    const bells = () => within(screen.getByTestId("sit-bell-choices"));

    it("offers a per-minute length starting at the stored preference", () => {
      // Six chips until #930 brought the per-minute control back (reversing
      // #785): one adjustable slider announcing minutes, steppers for precision.
      renderWithProviders(<MeditationHomeScreen />);

      expect(lengths().getByText("20 min")).toBeTruthy();
      expect(lengths().getByLabelText("Length").props.accessibilityValue).toEqual({
        min: 1,
        max: 120,
        now: 20,
        text: "20 min",
      });
    });

    it("expresses a stored length no chip ever drew, directly", () => {
      // Onboarding lets someone commit to 15 minutes. The chip row needed a
      // seventh button appended for it; the slider simply starts there.
      mockUseMeditationProgramState.mockReturnValue({
        data: { currentStage: 3, preferredDurationMinutes: 15 },
      } as unknown as ReturnType<typeof useMeditationProgramState>);

      renderWithProviders(<MeditationHomeScreen />);

      expect(lengths().getByText("15 min")).toBeTruthy();
      expect(lengths().getByLabelText("Length").props.accessibilityValue.now).toBe(15);
    });

    it("drives the read-out and ends-about off a one-minute step", () => {
      renderWithProviders(<MeditationHomeScreen />);

      const before = screen.getByText(/^ends about /).props.children;
      fireEvent.press(lengths().getByLabelText("One minute more"));
      const after = screen.getByText(/^ends about /).props.children;

      // 20 minutes and 21 minutes cannot land on the same clock minute.
      expect(after).not.toBe(before);
      expect(lengths().getByText("21 min")).toBeTruthy();
      expect(lengths().getByLabelText("Length").props.accessibilityValue.now).toBe(21);
    });

    it("offers the interval bell with Off selected by default", () => {
      renderWithProviders(<MeditationHomeScreen />);

      // Five since #1189 added half-time: Off, Half-time, 5, 10, 15.
      expect(bells().getAllByRole("radio")).toHaveLength(5);
      // A bell that rings without being asked for is a notification nobody opted
      // into; Off is the default and the rest are one tap away.
      expect(bells().getByText("Off").props.className).toContain("text-primary-ink");
    });

    it("remembers a length the user set, not only the one onboarding stored", async () => {
      // Until #1190 the slider read a stored seed and never wrote one back, so
      // someone who sat for 21 minutes every day re-set it every day.
      renderWithProviders(<MeditationHomeScreen />);

      fireEvent.press(lengths().getByLabelText("One minute more"));

      await waitFor(() =>
        expect(upsertProgramState).toHaveBeenCalledWith({ preferredDurationMinutes: 21 }),
      );
    });

    it("starts the interval bell on the stored choice rather than Off", () => {
      // The bell lived in useState(0) and reset to Off on every visit (#1190).
      setStoredPreferences({ meditationIntervalBellMinutes: 10 });

      renderWithProviders(<MeditationHomeScreen />);

      expect(bells().getByText("10 min").props.className).toContain("text-primary-ink");
      expect(bells().getByText("Off").props.className).not.toContain("text-primary-ink");
    });

    it("remembers the interval bell when it changes", async () => {
      renderWithProviders(<MeditationHomeScreen />);

      fireEvent.press(bells().getByText("5 min"));

      // A discrete choice has no travel, so its change already is its commit.
      // Both columns are written every time (#1189), so the pair cannot drift.
      await waitFor(() =>
        expect(updatePreferences).toHaveBeenCalledWith({
          meditationIntervalBellMinutes: 5,
          meditationBellAtHalf: false,
        }),
      );
    });

    it("offers half-time, which no minute spacing could express", async () => {
      // Half of a 25-minute sit is 12.5 minutes. TMI asks for exactly this
      // ("optional silent half-time bell", meditation-tmi.md:119) and a list of
      // whole-minute spacings cannot hold it (#1189).
      renderWithProviders(<MeditationHomeScreen />);

      fireEvent.press(bells().getByText("Half-time"));

      await waitFor(() =>
        expect(updatePreferences).toHaveBeenCalledWith({
          meditationIntervalBellMinutes: 0,
          meditationBellAtHalf: true,
        }),
      );
    });

    it("starts on half-time when that is what was stored", () => {
      setStoredPreferences({ meditationIntervalBellMinutes: 0, meditationBellAtHalf: true });

      renderWithProviders(<MeditationHomeScreen />);

      expect(bells().getByText("Half-time").props.className).toContain("text-primary-ink");
      expect(bells().getByText("Off").props.className).not.toContain("text-primary-ink");
    });

    it("hands half-time to the sitting screen as a key, not as a minute count", () => {
      const { router } = jest.requireMock<{ router: { push: jest.Mock } }>("expo-router");
      setStoredPreferences({ meditationIntervalBellMinutes: 0, meditationBellAtHalf: true });

      renderWithProviders(<MeditationHomeScreen />);
      fireEvent.press(screen.getByText("Begin"));

      // `12.5` would not survive the integer param; the sit resolves the key.
      expect(router.push).toHaveBeenCalledWith({
        pathname: "/tools/meditation/session",
        params: { duration: "20", bell: "half" },
      });
    });

    it("keeps the picked value when the write fails, and says nothing", async () => {
      // Persistence is best-effort, like the breathing session's volume writes:
      // the local pick owns this visit, so a failed write must not surface as an
      // error or escape as an unhandled rejection.
      updatePreferences.mockRejectedValue(new Error("offline"));
      renderWithProviders(<MeditationHomeScreen />);

      fireEvent.press(bells().getByText("15 min"));

      await waitFor(() => expect(updatePreferences).toHaveBeenCalled());
      expect(bells().getByText("15 min").props.className).toContain("text-primary-ink");
      expect(screen.queryByText(/went wrong|error/i)).toBeNull();
    });

    it("hands the stored bell to the sitting screen without a fresh tap", () => {
      const { router } = jest.requireMock<{ router: { push: jest.Mock } }>("expo-router");
      setStoredPreferences({ meditationIntervalBellMinutes: 10 });

      renderWithProviders(<MeditationHomeScreen />);
      fireEvent.press(screen.getByText("Begin"));

      expect(router.push).toHaveBeenCalledWith({
        pathname: "/tools/meditation/session",
        params: { duration: "20", bell: "10" },
      });
    });

    it("offers a bell volume, starting from the stored one", () => {
      // Until #1188 the bells were the one lane with no control - and measured
      // as the loudest sound in the app, louder than either breathing lane.
      setStoredPreferences({ bellVolume: 0.4 });

      renderWithProviders(<MeditationHomeScreen />);

      const volume = within(screen.getByTestId("sit-bell-volume"));
      expect(volume.getByText("40%")).toBeTruthy();
      expect(volume.getByLabelText("Bell volume").props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 40,
      });
    });

    it("starts at full volume when nothing has been stored", () => {
      // Deliberately not quieter: #1130 owns absolute loudness and is
      // re-rendering the clips down, so a quiet default here would stack.
      renderWithProviders(<MeditationHomeScreen />);

      expect(within(screen.getByTestId("sit-bell-volume")).getByText("100%")).toBeTruthy();
    });

    it("reads Off rather than 0% when the bells are muted", () => {
      setStoredPreferences({ bellVolume: 0 });

      renderWithProviders(<MeditationHomeScreen />);

      const volume = within(screen.getByTestId("sit-bell-volume"));
      expect(volume.getByText("Off")).toBeTruthy();
      expect(volume.queryByText("0%")).toBeNull();
    });

    it("persists the bell volume when the drag settles, not while it moves", async () => {
      setStoredPreferences({ bellVolume: 0.6 });
      renderWithProviders(<MeditationHomeScreen />);

      const slider = within(screen.getByTestId("sit-bell-volume")).getByLabelText("Bell volume");
      expect(updatePreferences).not.toHaveBeenCalled();

      fireEvent(slider, "responderRelease");

      await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({ bellVolume: 0.6 }));
    });

    it("offers a background sound for the sit, None first and chosen by default", () => {
      // #1742: a bed beside the bell volume, never in place of silence. The
      // default is `none`, it is the first row, and nothing on the card says a
      // bed is expected - the volume control only appears once one is chosen.
      renderWithProviders(<MeditationHomeScreen />);

      const beds = within(screen.getByTestId("sit-bed-choices"));
      expect(within(beds.getAllByRole("radio")[0]).getByText("None")).toBeTruthy();
      expect(beds.getByRole("radio", { name: "None", checked: true })).toBeTruthy();
      expect(beds.getByText("Rain")).toBeTruthy();
      expect(screen.queryByTestId("sit-bed-volume")).toBeNull();
    });

    it("writes the picked bed, and only then offers its volume", async () => {
      renderWithProviders(<MeditationHomeScreen />);

      fireEvent.press(within(screen.getByTestId("sit-bed-choices")).getByText("Rain"));

      await waitFor(() =>
        expect(updatePreferences).toHaveBeenCalledWith({ meditationAmbientSoundId: "rain" }),
      );
      const volume = within(screen.getByTestId("sit-bed-volume"));
      expect(volume.getByText("50%")).toBeTruthy();
      expect(volume.getByLabelText("Background sound volume").props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 50,
      });
    });

    it("starts from the stored bed and volume, and persists the volume on commit", async () => {
      setStoredPreferences({ meditationAmbientSoundId: "ocean", meditationAmbientVolume: 0.3 });
      renderWithProviders(<MeditationHomeScreen />);

      const beds = within(screen.getByTestId("sit-bed-choices"));
      expect(beds.getByRole("radio", { name: "Ocean", checked: true })).toBeTruthy();
      const volume = within(screen.getByTestId("sit-bed-volume"));
      expect(volume.getByText("30%")).toBeTruthy();
      expect(updatePreferences).not.toHaveBeenCalled();

      fireEvent(volume.getByLabelText("Background sound volume"), "responderRelease");

      await waitFor(() =>
        expect(updatePreferences).toHaveBeenCalledWith({ meditationAmbientVolume: 0.3 }),
      );
    });

    it("never borrows the breathing bed", () => {
      // The one thing #1742 forbids: rain chosen for breathing must not play
      // under a sit the person never asked it for. Its own columns, its own row.
      setStoredPreferences({ ambientSoundId: "rain", ambientVolume: 0.9 });
      renderWithProviders(<MeditationHomeScreen />);

      const beds = within(screen.getByTestId("sit-bed-choices"));
      expect(beds.getByRole("radio", { name: "None", checked: true })).toBeTruthy();
      expect(screen.queryByTestId("sit-bed-volume")).toBeNull();
    });

    it("hands both choices to the sitting screen when the sit begins", () => {
      const { router } = jest.requireMock<{ router: { push: jest.Mock } }>("expo-router");
      renderWithProviders(<MeditationHomeScreen />);

      fireEvent.press(bells().getByText("5 min"));
      fireEvent.press(screen.getByText("Begin"));

      // The rows here ARE the setup: the sitting screen (#786) takes the length
      // and the bell as params rather than re-asking, and owns the clock.
      expect(router.push).toHaveBeenCalledWith({
        pathname: "/tools/meditation/session",
        params: { duration: "20", bell: "5" },
      });
    });
  });

  describe("minutes sat", () => {
    const windowDay = (dayKey: string, durationMinutes: number) => ({
      dayKey,
      durationMinutes,
      obstacleTags: [],
    });

    it("stays off the screen while the window has not loaded", () => {
      // Undefined is in flight, or failed with no cache. Thirty stub columns
      // there would claim a month of not sitting that nobody has established.
      setSessions([session()]);
      setMinutesWindow(undefined);

      renderWithProviders(<MeditationHomeScreen />);

      expect(screen.queryByText("Minutes sat")).toBeNull();
      expect(screen.queryAllByTestId("bar-chart-bar")).toHaveLength(0);
    });

    it("stays off the screen when the loaded window holds no sits", () => {
      setSessions([session()]);
      setMinutesWindow([]);

      renderWithProviders(<MeditationHomeScreen />);

      expect(screen.queryByText("Minutes sat")).toBeNull();
    });

    it("draws thirty columns, with a 2px stub for a day nobody sat", () => {
      setSessions([session()]);
      setMinutesWindow([windowDay(currentDateKey(), 30)]);

      renderWithProviders(<MeditationHomeScreen />);

      const bars = screen.getAllByTestId("bar-chart-bar");
      expect(bars).toHaveLength(30);
      // Twenty-nine zero days, each a stub rather than nothing: a gap in a
      // thirty-column row reads as missing data, not as a rest day.
      const stubs = bars.filter((bar) => bar.props.style?.height === 2);
      expect(stubs).toHaveLength(29);
    });

    it("fills bars with the accent, never the invisible muted wash", () => {
      setSessions([session()]);
      setMinutesWindow([windowDay(currentDateKey(), 30)]);

      renderWithProviders(<MeditationHomeScreen />);

      const [bar] = screen.getAllByTestId("bar-chart-bar");
      // `bg-muted` measures 1.10:1 on card and 1.02:1 on background - not low
      // contrast, invisible (#725). WCAG 1.4.11 wants 3:1 for the bars.
      expect(bar!.props.className).toContain("bg-primary");
      expect(bar!.props.className).not.toContain("bg-muted");
    });

    it("bounds the window from the clock read on focus, so it rolls over at midnight", () => {
      // Pinned at mount, the bound never advances: a screen left mounted
      // overnight keeps drawing yesterday's thirty days under today's labels
      // until something unrelated invalidates the query.
      jest.useFakeTimers({ now: new Date("2026-08-07T12:00:00+05:30") });
      try {
        setSessions([session()]);
        setMinutesWindow([]);

        renderWithProviders(<MeditationHomeScreen />);

        expect(mockUseMeditationMinutesWindow).toHaveBeenLastCalledWith(
          "user-1",
          minutesWindowFromIso(MINUTES_WINDOW_DAYS, new Date("2026-08-07T12:00:00+05:30")),
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it("asks for nothing until the clock has been read", () => {
      // The first render happens before the focus effect runs. An empty bound
      // there must not become a fetch from the epoch.
      setSessions([session()]);
      setMinutesWindow([]);

      renderWithProviders(<MeditationHomeScreen />);

      expect(mockUseMeditationMinutesWindow).toHaveBeenCalledWith("user-1", "");
    });

    it("gives the whole chart one text equivalent rather than thirty silent boxes", () => {
      setSessions([session()]);
      setMinutesWindow([windowDay(currentDateKey(), 30)]);

      renderWithProviders(<MeditationHomeScreen />);

      expect(screen.getByLabelText("30 minutes sat over the last 30 days.")).toBeTruthy();
    });
  });

  describe("recent sits", () => {
    it("lists five and links out, with no load-more button", () => {
      setSessions(
        Array.from({ length: 8 }, (_, i) =>
          session({ id: `s${i}`, durationMinutes: 10 + i, reflection: `note ${i}` }),
        ),
      );

      renderWithProviders(<MeditationHomeScreen />);

      // `Load 5 more` is deleted: growing the list in place is what the
      // all-sits screen is for (#696).
      expect(screen.queryByText(/Load \d+ more/)).toBeNull();
      expect(screen.getByText("Show all sits")).toBeTruthy();
      expect(screen.getByText("note 0")).toBeTruthy();
      expect(screen.getByText("note 4")).toBeTruthy();
      expect(screen.queryByText("note 5")).toBeNull();
    });

    it("dates a row by the day captured with the sit", () => {
      // Captured at UTC-11, where this instant is still June 1. The viewer
      // (Asia/Kolkata) reads June 2 off the raw instant - and would file the row
      // under a day its own label contradicts (#250).
      setSessions([
        session({
          completedAt: "2026-06-02T10:00:00Z",
          completedOffsetMinutes: -660,
          dayKey: "2026-06-01",
        }),
      ]);

      renderWithProviders(<MeditationHomeScreen />);

      // By role, because `20 min` is also one of the length buttons above.
      expect(screen.getByRole("button", { name: "20 min" })).toBeTruthy();
      expect(screen.getByText("Stage 2")).toBeTruthy();
    });

    it("says nothing about an empty history until one has loaded", () => {
      renderWithProviders(<MeditationHomeScreen />);

      expect(screen.getByText("No sessions yet. Start whenever you're ready.")).toBeTruthy();
      // No link out of an empty list - it would lead to the same emptiness.
      expect(screen.queryByText("Show all sits")).toBeNull();
    });

    it("keeps two same-length sits apart for a screen reader", () => {
      // An explicit `accessibilityLabel` on the row would override the name
      // assembled from its children, announcing both of these as "12 min" and
      // nothing else - two identical rows with no way to choose between them.
      setSessions([
        session({ id: "a", durationMinutes: 12, stageAtSession: 2, reflection: "Settled early." }),
        session({ id: "b", durationMinutes: 12, stageAtSession: 5, reflection: "Restless." }),
      ]);

      renderWithProviders(<MeditationHomeScreen />);

      const rows = screen.getAllByRole("button", { name: /12 min/ });
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.props.accessibilityLabel).toBeUndefined();
      }
      expect(screen.getByText("Stage 2")).toBeTruthy();
      expect(screen.getByText("Stage 5")).toBeTruthy();
    });
  });

  describe("your practice", () => {
    it("offers the stage and the framework as hairline rows", () => {
      renderWithProviders(<MeditationHomeScreen />);

      expect(screen.getByText("Your practice")).toBeTruthy();
      expect(screen.getByText("Stage 3 — Overcoming forgetting")).toBeTruthy();
      expect(screen.getByText("Learn the framework")).toBeTruthy();
    });
  });

  /**
   * react-native-web hands a `link`'s Enter to the browser, expecting a native
   * anchor - and this href-less Pressable is a `<div role="link">` the browser
   * does nothing with, so Tab reached a link and Enter opened nothing (#1735).
   * The link brings its own Enter handler: once per press, never on auto-repeat,
   * never on Space (a link does not activate on Space) - and never on a button,
   * which react-native-web activates itself; a second handler there would fire
   * the press twice.
   *
   * ⚠️ jest can only prove the handler is there. The browser half - a real Enter
   * on a real `<div role="link">` - is proven once for the helper itself, on the
   * support page's Show-all door, in `test/e2e/support-page.e2e.test.ts`.
   */
  describe("links on web", () => {
    const { router } = jest.requireMock<{ router: { push: jest.Mock } }>("expo-router");

    beforeEach(() => {
      setPlatformOS("web");
    });

    afterEach(() => {
      setPlatformOS("ios");
      jest.mocked(useStagePracticeNotes).mockReturnValue({
        data: undefined,
      } as unknown as ReturnType<typeof useStagePracticeNotes>);
    });

    it("the sessions link activates on Enter, once, and not on a held key or on Space; no button brings a handler", () => {
      // The link renders only once a sit exists.
      setSessions([session({ id: "s0" })]);

      renderWithProviders(<MeditationHomeScreen />);

      const door = screen.getByRole("link", { name: "Show all sits" });
      const preventDefault = jest.fn();
      door.props.onKeyDown({ key: "Enter", repeat: false, preventDefault });
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith("/tools/meditation/sessions");
      expect(preventDefault).toHaveBeenCalledTimes(1);

      door.props.onKeyDown({ key: "Enter", repeat: true, preventDefault });
      door.props.onKeyDown({ key: " ", repeat: false, preventDefault });
      expect(router.push).toHaveBeenCalledTimes(1);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) {
        expect(button.props.onKeyDown).toBeUndefined();
      }
    });

    it("the daily-life link activates on Enter, once, and not on a held key or on Space", () => {
      // The link renders only at stage 10, and only once more notes exist than the
      // card shows.
      mockUseMeditationProgramState.mockReturnValue({
        data: { currentStage: 10, preferredDurationMinutes: 20 },
      } as unknown as ReturnType<typeof useMeditationProgramState>);
      jest.mocked(useStagePracticeNotes).mockReturnValue({
        data: Array.from({ length: 8 }, (_, i) => ({
          id: `n${i}`,
          stage: 10,
          note: `practice note ${i}`,
          updatedAt: "2026-05-01T08:00:00.000Z",
        })),
      } as unknown as ReturnType<typeof useStagePracticeNotes>);

      renderWithProviders(<MeditationHomeScreen />);

      const door = screen.getByRole("link", { name: "View all" });
      const preventDefault = jest.fn();
      door.props.onKeyDown({ key: "Enter", repeat: false, preventDefault });
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith("/tools/meditation/daily-life");
      expect(preventDefault).toHaveBeenCalledTimes(1);

      door.props.onKeyDown({ key: "Enter", repeat: true, preventDefault });
      door.props.onKeyDown({ key: " ", repeat: false, preventDefault });
      expect(router.push).toHaveBeenCalledTimes(1);

      // The card's own Save button sits in the same tree.
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) {
        expect(button.props.onKeyDown).toBeUndefined();
      }
    });
  });
});
