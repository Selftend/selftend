import { fireEvent, screen } from "@testing-library/react-native";

import BreathingExerciseScreen from "@/app/(app)/tools/breathing/session";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { renderWithProviders } from "@/test/render-with-providers";

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

jest.mock("@/src/lib/color-scheme", () => ({ useAppColorScheme: () => "light" }));

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

describe("Breathing cycle runner", () => {
  it("opens on the default cycle count with calculated total time", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    // box-breathing default is 8 cycles x 16s = 128s = 2:08
    expect(screen.getAllByText("8 cycles").length).toBeGreaterThan(0);
    expect(screen.getByText(/2:08/)).toBeTruthy();
  });

  it("recalculates total time when the + stepper is pressed", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    // default 8 cycles; press + once -> 9 x 16s = 144s = 2:24
    fireEvent.press(screen.getByLabelText("Increase cycles"));
    expect(screen.getByText(/2:24/)).toBeTruthy();
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
});
