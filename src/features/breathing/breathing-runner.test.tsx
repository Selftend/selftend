import { act, fireEvent, screen, within } from "@testing-library/react-native";

import BreathingExerciseScreen from "@/app/(app)/tools/breathing/session";
import { resolveBreathSoundId } from "@/src/constants/breathing-sounds";
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
const mockPrefs = { breathSoundId: "none", ambientSoundId: "none" };
jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: mockPrefs }),
  useUpdateUserPreferences: () => ({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
}));
const mockPlayIntroCue = jest.fn();
jest.mock("@/src/features/breathing/use-breathing-audio", () => ({
  useBreathingAudio: () => {},
  playIntroCue: (...args: unknown[]) => mockPlayIntroCue(...args),
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
  mockPlayIntroCue.mockClear();
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

  it("plays no intro and reads None on the Sounds row for a retired breath id", () => {
    // ☠️ `wind` is still in `user_preferences.breath_sound_id` on any account that
    // picked it before 2026-08-30. The screen does not resolve it - the repository
    // does, once, when the row is read (#1745) - so this feeds the screen exactly
    // what the repository hands over for a stored `wind`, and asserts the two
    // things the raw lookups used to decide on their own: no spoken intro, and a
    // Sounds row that reads "None" rather than a raw key or a blank.
    const breathSoundId = resolveBreathSoundId("wind");
    expect(breathSoundId).toBe("none");
    mockPrefs.breathSoundId = breathSoundId;
    renderWithProviders(<BreathingExerciseScreen />);
    expect(screen.getByText("Voice guidance")).toBeTruthy();
    expect(screen.getAllByText("None")).toHaveLength(2);
    expect(screen.queryByText(/^breathing\./)).toBeNull();
    fireEvent.press(screen.getByText("Start"));
    // Straight to the active screen: no preroll, no cue.
    expect(screen.queryByText("Get ready...")).toBeNull();
    expect(mockPlayIntroCue).not.toHaveBeenCalled();
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
