import { act, fireEvent, screen, waitFor, within } from "@testing-library/react-native";

import BreathingExerciseScreen from "@/app/(app)/tools/breathing/session";
import { breathSoundLookup } from "@/src/constants/breathing-sounds";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: jest.fn(() => false),
}));

// beforeRemove listeners the screen registers on the (mocked) navigator, so a
// test can play the OS back gesture / web back button mid-session.
const beforeRemoveListeners: ((event: {
  preventDefault: () => void;
  data: { action: unknown };
}) => void)[] = [];
const mockNavigation = {
  addListener: (type: string, listener: (event: never) => void) => {
    if (type === "beforeRemove") beforeRemoveListeners.push(listener as never);
    return () => {
      const index = beforeRemoveListeners.indexOf(listener as never);
      if (index >= 0) beforeRemoveListeners.splice(index, 1);
    };
  },
  dispatch: jest.fn(),
};

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ pattern: "box-breathing" }),
  usePathname: () => "/tools/breathing/session",
  useFocusEffect: jest.fn(),
  useNavigation: () => mockNavigation,
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

const mockSaveMutateAsync = jest.fn().mockResolvedValue(undefined);
jest.mock("@/src/features/breathing/queries", () => ({
  useSaveBreathingSession: () => ({ mutateAsync: mockSaveMutateAsync, isPending: false }),
}));

jest.mock("@/src/features/breathing/exercises-queries", () => ({
  useBreathingExercise: () => ({ data: null, isLoading: false }),
  useBreathingExercises: () => ({ data: [] }),
}));

jest.mock("@/src/lib/color-scheme", () => ({ useColorSchemeName: () => "light" }));

// breathSoundId "none" => no spoken intro, so Start goes straight to the active
// screen. A test that needs the preroll swaps in "guided" (which has an intro).
const mockPrefs: { breathSoundId: string; ambientSoundId: string; breathVolume?: number } = {
  breathSoundId: "none",
  ambientSoundId: "none",
};
// Set a `user_preferences` row here to bypass `mockPrefs` and read through the REAL
// repository and query hook instead (mocked database -> mapper -> query -> screen),
// for a test about what the mapper does to a stored id (#1745). Null = `mockPrefs`.
let mockStoredRow: Record<string, unknown> | null = null;
jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: mockStoredRow, error: null }) }),
      }),
    }),
  }),
}));
jest.mock("@/src/features/settings/queries", () => {
  const actual = jest.requireActual<typeof import("@/src/features/settings/queries")>(
    "@/src/features/settings/queries",
  );
  return {
    useUserPreferences: () => {
      // Called unconditionally (hooks rule); a null user id disables the query.
      const real = actual.useUserPreferences(mockStoredRow ? "user-1" : null);
      return mockStoredRow ? real : { data: mockPrefs };
    },
    useUpdateUserPreferences: () => ({
      mutateAsync: jest.fn().mockResolvedValue(undefined),
      isPending: false,
    }),
  };
});
jest.mock("@/src/features/breathing/use-breathing-audio", () => ({
  useBreathingAudio: () => {},
}));

// The spoken intro is loaded while setup shows and only played at Start (#1744).
// One fake per preparation, so a test can tell "loaded ahead" from "played" and
// count what was let go.
const mockPrepareOneShot = jest.fn();
const mockIntroPlay = jest.fn();
const mockIntroRelease = jest.fn();
jest.mock("@/src/lib/native-audio", () => ({
  prepareOneShot: (asset: number) => {
    mockPrepareOneShot(asset);
    return { play: mockIntroPlay, release: mockIntroRelease };
  },
}));

jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (s: { showToast: () => void }) => unknown) =>
    selector({ showToast: jest.fn() }),
}));

const mockUseReduceMotionEnabled = useReduceMotionEnabled as jest.MockedFunction<
  typeof useReduceMotionEnabled
>;

// setup.js replaces reanimated with react-native-reanimated/mock (a plain
// object), so the pacer's withTiming calls can be observed with a spy.
const reanimatedMock = jest.requireMock("react-native-reanimated") as {
  withTiming: (...args: unknown[]) => unknown;
};
const withTimingSpy = jest.spyOn(reanimatedMock, "withTiming");

beforeEach(() => {
  mockUseReduceMotionEnabled.mockReturnValue(false);
  withTimingSpy.mockClear();
  mockSaveMutateAsync.mockClear();
  beforeRemoveListeners.length = 0;
  mockPrefs.breathSoundId = "none";
  delete mockPrefs.breathVolume;
  mockStoredRow = null;
  mockPrepareOneShot.mockClear();
  mockIntroPlay.mockClear();
  mockIntroRelease.mockClear();
});

const startSession = () => {
  renderWithProviders(<BreathingExerciseScreen />);
  fireEvent.press(screen.getByText("Start"));
};

const fireBack = () => {
  const event = { preventDefault: jest.fn(), data: { action: {} } };
  act(() => {
    for (const listener of [...beforeRemoveListeners]) listener(event);
  });
  return event;
};

describe("Breathing session setup (4b)", () => {
  it("opens on the default cycle count with calculated total time", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    // box-breathing default is 8 cycles x 16s = 128s = 2:08. The read-out is one
    // composed node ("8 cycles · 2:08"), so match it by pattern.
    expect(screen.getByText(/8 cycles/)).toBeTruthy();
    expect(screen.getByText(/2:08/)).toBeTruthy();
  });

  it("picks a length in minutes and derives the cycle count from the pattern", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    // Box breathing is 16s per cycle, so a 3-minute target is 180/16 ≈ 11 cycles.
    fireEvent.press(screen.getByLabelText("3 min"));
    expect(screen.getByText(/11 cycles/)).toBeTruthy();
    expect(screen.getByText(/2:56/)).toBeTruthy(); // 11 x 16s
  });

  it("offers five length buttons and marks the active one", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    const buttons = within(screen.getByTestId("breathing-length-buttons")).getAllByRole("radio");
    expect(buttons).toHaveLength(5);

    fireEvent.press(screen.getByLabelText("1 min"));
    const checked = within(screen.getByTestId("breathing-length-buttons")).getAllByRole("radio", {
      checked: true,
    });
    expect(checked).toHaveLength(1);
  });

  it("draws one timing segment per non-zero phase", () => {
    // Box breathing has four real phases, so four segments and four labels.
    renderWithProviders(<BreathingExerciseScreen />);
    const bar = screen.getByTestId("breathing-timing-bar");
    expect(bar.props.children.filter(Boolean)).toHaveLength(4);
  });

  it("lists every pattern as a tab, with the requested one selected", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    const tabs = within(screen.getByTestId("breathing-pattern-tabs")).getAllByRole("radio");
    expect(tabs).toHaveLength(3); // three built-ins, no custom patterns in this mock

    const checked = within(screen.getByTestId("breathing-pattern-tabs")).getAllByRole("radio", {
      checked: true,
    });
    expect(checked).toHaveLength(1);
    expect(checked[0]).toBe(tabs[0]); // ?pattern=box-breathing
  });

  it("shows the current sound on each row rather than a raw key", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    expect(screen.getByText("Voice guidance")).toBeTruthy();
    expect(screen.getByText("Ambient sound")).toBeTruthy();
    // Both prefs are "none", whose label lives at `sounds.none` - building the
    // key from the id would render "breathing.sounds.breath.none" here.
    expect(screen.getAllByText("None")).toHaveLength(2);
    expect(screen.queryByText(/^breathing\./)).toBeNull();
  });

  it("does not intercept back from setup", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    const event = fireBack();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  /**
   * #873: the setup content sits on the decided 620px form column (#690 —
   * widths ride with the shell). Asserted on className tokens, because
   * NativeWind classes never become styles under jest — a resolved-style
   * assertion would be vacuously green.
   */
  it("keeps the setup content on the 620px form column", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    const tokens = String(screen.getByTestId("breathing-setup-column").props.className).split(
      /\s+/,
    );
    expect(tokens).toContain("max-w-[620px]");
    expect(tokens).toContain("self-center");
    expect(tokens).toContain("w-full");
  });
});

describe("Breathing session (4c)", () => {
  it("runs on the focus shell: wash, pattern eyebrow, cycle/time row, pacer", () => {
    startSession();
    // The wash is aria-hidden decoration, invisible to default queries.
    expect(screen.getByTestId("focus-surface-wash", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText("Box breathing")).toBeTruthy();
    // The top row is one composed node: "Cycle 1 of 8 · 2:08 left".
    expect(screen.getByText(/Cycle 1 of 8/)).toBeTruthy();
    expect(screen.getByText(/2:08 left/)).toBeTruthy();
    expect(screen.getByTestId("breathing-pacer", { includeHiddenElements: true })).toBeTruthy();
    // Shell B has no breadcrumb / page chrome - the setup back bar is gone.
    expect(screen.queryByTestId("screen-top-bar")).toBeNull();
  });

  it("shows the phase name and the timing line that carries the beat as text", () => {
    startSession();
    expect(screen.getByText("Inhale")).toBeTruthy();
    // 4s of inhale, then box breathing's hold - the non-visual carrier of the
    // same information the circle animates.
    expect(screen.getByText("4s · then Hold")).toBeTruthy();
  });

  it("renders both volume rails as adjustable sliders with live percentages", () => {
    startSession();
    expect(screen.getByLabelText("Breath volume")).toBeTruthy();
    expect(screen.getByLabelText("Ambient volume")).toBeTruthy();
    // Defaults: breath 0.7, ambient 0.5.
    expect(screen.getByText("70%")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
  });

  it("pauses the shared clock and resumes mid-phase", () => {
    jest.useFakeTimers();
    try {
      startSession();
      // 4s of inhale + a beat: box breathing is in "Hold" with ~2:03 left.
      act(() => jest.advanceTimersByTime(4_600));
      expect(screen.getByText("Hold")).toBeTruthy();
      expect(screen.getByText(/2:04 left|2:03 left/)).toBeTruthy();
      const frozen = screen.getByText(/left/).props.children as string;

      fireEvent.press(screen.getByText("Pause"));
      expect(screen.getByText("Paused")).toBeTruthy();
      // Ten paused seconds move nothing: same phase, same read-out.
      act(() => jest.advanceTimersByTime(10_000));
      expect(screen.getByText("Hold")).toBeTruthy();
      expect(screen.getByText(/left/).props.children).toEqual(frozen);

      fireEvent.press(screen.getByText("Resume"));
      act(() => jest.advanceTimersByTime(300));
      // Still holding (the phase had ~3.4s left when paused), clock moving again.
      expect(screen.getByText("Hold")).toBeTruthy();
      expect(screen.queryByText("Paused")).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("records the session when finishing early", async () => {
    startSession();
    fireEvent.press(screen.getByText("Finish early"));
    await act(async () => {});
    expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockSaveMutateAsync.mock.calls[0][0]).toMatchObject({
      exerciseName: "box-breathing",
      cycles: 0, // finished within the first cycle
    });
  });

  it("back mid-session pauses and asks, and confirming saves", async () => {
    startSession();
    const event = fireBack();
    expect(event.preventDefault).toHaveBeenCalled();
    // The clock is paused under the dialog, never silently discarded.
    expect(screen.getByText("Paused")).toBeTruthy();
    expect(screen.getByText("Finish this session?")).toBeTruthy();

    fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    await act(async () => {});
    expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1);
  });

  it("back mid-session then 'Keep going' resumes without saving", () => {
    startSession();
    fireBack();
    fireEvent.press(screen.getByText("Keep going"));
    expect(screen.queryByText("Finish this session?")).toBeNull();
    expect(screen.queryByText("Paused")).toBeNull();
    expect(mockSaveMutateAsync).not.toHaveBeenCalled();
  });

  it("offers no session controls during the preroll, so nothing false can be saved", () => {
    // "guided" has a spoken intro: Start enters a ~4s preroll before the clock
    // exists. A Finish rendered here measured elapsed time from a start that
    // never happened and recorded the whole session as completed (Codex P1).
    // Fake timers so the pending preroll timeout doesn't outlive the test.
    jest.useFakeTimers();
    try {
      mockPrefs.breathSoundId = "guided";
      startSession();
      expect(screen.getByText("Get ready...")).toBeTruthy();
      expect(screen.queryByText("Finish early")).toBeNull();
      expect(screen.queryByText("Pause")).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("loads the guided intro while setup shows, so Start only plays it", () => {
    // The spoken intro used to be built at the tap and arrived late by the asset
    // load (#1744). Now setup loads it as soon as a guided voice is selected, and
    // the tap plays what is already there - at the slider's live value.
    jest.useFakeTimers();
    try {
      mockPrefs.breathSoundId = "guided";
      renderWithProviders(<BreathingExerciseScreen />);
      expect(mockPrepareOneShot).toHaveBeenCalledTimes(1);
      expect(mockPrepareOneShot).toHaveBeenCalledWith(breathSoundLookup.guided!.introAsset);
      expect(mockIntroPlay).not.toHaveBeenCalled();

      fireEvent.press(screen.getByText("Start"));
      expect(mockIntroPlay).toHaveBeenCalledTimes(1);
      expect(mockIntroPlay).toHaveBeenCalledWith(0.7);
      // The tap built nothing.
      expect(mockPrepareOneShot).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("builds no intro at volume 0, so a muted voice never configures the audio session", () => {
    // The #1188 rule, on the breathing side: nothing is prepared - and so nothing
    // reaches ensureNativeAudioMode - for a sound nobody would hear. Start still
    // runs the silent preroll; it just has nothing to play.
    jest.useFakeTimers();
    try {
      mockPrefs.breathSoundId = "guided";
      mockPrefs.breathVolume = 0;
      startSession();
      expect(screen.getByText("Get ready...")).toBeTruthy();
      expect(mockPrepareOneShot).not.toHaveBeenCalled();
      expect(mockIntroPlay).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("loads no intro for a voice without one, and lets go of a loaded intro on leaving setup", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    expect(mockPrepareOneShot).not.toHaveBeenCalled();

    mockPrefs.breathSoundId = "guided";
    const { unmount } = renderWithProviders(<BreathingExerciseScreen />);
    expect(mockPrepareOneShot).toHaveBeenCalledTimes(1);
    expect(mockIntroRelease).not.toHaveBeenCalled();
    unmount();
    expect(mockIntroRelease).toHaveBeenCalledTimes(1);
    expect(mockIntroPlay).not.toHaveBeenCalled();
  });

  it("plays no intro and reads None on the Sounds row for a stored, retired breath id", async () => {
    // ☠️ `wind` is still in `user_preferences.breath_sound_id` on any account that
    // picked it before 2026-08-30. The screen does not resolve it - the repository
    // does, once, when the row is read (#1745) - so the row goes in RAW and travels
    // the real path (mocked database -> mapper -> query -> screen). Asserted: the
    // two things the raw lookups used to decide on their own - no spoken intro, and
    // a Sounds row that reads "None" rather than a raw key or a blank.
    //
    // ⚠️ Pre-load the screen shows the DEFAULT voice (guided, one "None" for the
    // bed); the second "None" is what proves the row was read and resolved.
    mockStoredRow = { user_id: "user-1", breath_sound_id: "wind", ambient_sound_id: "none" };
    renderWithProviders(<BreathingExerciseScreen />);
    expect(screen.getByText("Voice guidance")).toBeTruthy();
    // ☠️ `findAllByText` would resolve on the FIRST match - the pre-load bed's "None"
    // - so wait for the count instead.
    await waitFor(() => expect(screen.getAllByText("None")).toHaveLength(2));
    expect(screen.queryByText(/^breathing\./)).toBeNull();
    fireEvent.press(screen.getByText("Start"));
    // Straight to the active screen: no preroll, no cue. The default voice's intro
    // WAS loaded ahead while the row was still in flight (#1744) - and let go once
    // the row resolved to none, so nothing prepared is left holding a player.
    expect(screen.queryByText("Get ready...")).toBeNull();
    expect(mockIntroPlay).not.toHaveBeenCalled();
    expect(mockIntroRelease).toHaveBeenCalledTimes(mockPrepareOneShot.mock.calls.length);
    expect(screen.getByText("Inhale")).toBeTruthy();
  });

  it("animates the pacer with withTiming when motion is allowed", () => {
    startSession();
    expect(withTimingSpy).toHaveBeenCalled();
  });

  it("does not call withTiming when reduce motion is enabled, and keeps the text carriers", () => {
    mockUseReduceMotionEnabled.mockReturnValue(true);
    startSession();
    // The substitute #777 chose: phase name + per-phase countdown, no motion.
    expect(screen.getByText("Inhale")).toBeTruthy();
    expect(screen.getByText("4s · then Hold")).toBeTruthy();
    expect(withTimingSpy).not.toHaveBeenCalled();
  });
});
