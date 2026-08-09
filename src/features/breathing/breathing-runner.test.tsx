import { fireEvent, screen, within } from "@testing-library/react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BreathingExerciseScreen from "@/app/(app)/tools/breathing/session";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";

jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: jest.fn(() => false),
}));

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ pattern: "box-breathing" }),
  usePathname: () => "/tools/breathing/session",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/breathing/queries", () => ({
  useSaveBreathingSession: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/src/features/breathing/exercises-queries", () => ({
  useBreathingExercise: () => ({ data: null, isLoading: false }),
  useBreathingExercises: () => ({ data: [] }),
}));

jest.mock("@/src/lib/color-scheme", () => ({ useColorSchemeName: () => "light" }));

jest.mock("@/src/features/settings/queries", () => ({
  // breathSoundId "none" => no spoken intro, so Start goes straight to the active screen.
  useUserPreferences: () => ({ data: { breathSoundId: "none", ambientSoundId: "none" } }),
  useUpdateUserPreferences: () => ({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
}));
jest.mock("@/src/features/breathing/use-breathing-audio", () => ({
  useBreathingAudio: () => {},
  playIntroCue: () => {},
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
});

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

  it("shows the phase label and cycle progress after starting", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    fireEvent.press(screen.getByText("Start"));
    expect(screen.getByText("Inhale")).toBeTruthy();
    expect(screen.getByText("Cycle 1 of 8")).toBeTruthy();
  });

  it("animates the pacer with withTiming when motion is allowed", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    fireEvent.press(screen.getByText("Start"));
    expect(withTimingSpy).toHaveBeenCalled();
  });

  it("does not call withTiming when reduce motion is enabled", () => {
    mockUseReduceMotionEnabled.mockReturnValue(true);
    renderWithProviders(<BreathingExerciseScreen />);
    fireEvent.press(screen.getByText("Start"));
    // The pacer still runs (phase label shows) but steps state without animating.
    expect(screen.getByText("Inhale")).toBeTruthy();
    expect(withTimingSpy).not.toHaveBeenCalled();
  });

  it("renders the aqua room pour with no field header (session = pour only)", () => {
    renderWithProviders(<BreathingExerciseScreen />);

    // The root carries the aqua room re-pour; a wrong or missing room fails here.
    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
  });
});
