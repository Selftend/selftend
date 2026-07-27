import { screen } from "@testing-library/react-native";
import { useColorScheme } from "nativewind";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MeditationStageDetailScreen from "@/src/features/meditation/meditation-stage-detail-screen";
import { useMeditationProgramState } from "@/src/features/meditation/queries";
import { roomVariables } from "@/src/lib/module-room";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ n: "2" }),
  usePathname: () => "/tools/meditation/stages/2",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationProgramState: jest.fn(),
  useUpsertMeditationProgramState: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

// Everything else in nativewind stays real (the styling interop the whole
// render depends on); only the scheme read is steerable, so the pour can be
// asserted in dark as well as light.
jest.mock("nativewind", () => ({
  ...jest.requireActual("nativewind"),
  useColorScheme: jest.fn(() => ({ colorScheme: "light" })),
}));

const mockUseColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;

const setScheme = (scheme: "light" | "dark") =>
  mockUseColorScheme.mockReturnValue({ colorScheme: scheme } as ReturnType<typeof useColorScheme>);

const mockUseMeditationProgramState = useMeditationProgramState as jest.MockedFunction<
  typeof useMeditationProgramState
>;

/** Every rendered view's class list, for asserting on tint utilities. */
const classNames = () =>
  screen
    .UNSAFE_getAllByType(View)
    .map((node) => String(node.props.className ?? ""))
    .filter(Boolean);

describe("MeditationStageDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setScheme("light");
    mockUseMeditationProgramState.mockReturnValue({
      data: { currentStage: 1 },
    } as unknown as ReturnType<typeof useMeditationProgramState>);
  });

  it("renders the stage's sections", () => {
    renderWithProviders(<MeditationStageDetailScreen />);

    expect(screen.getByRole("heading", { name: "Goal" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Obstacles" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Skills and methods" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Mastery" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Reflection prompts at this stage" })).toBeTruthy();
    // Not the current stage (1), so the switch control is offered.
    expect(screen.getByText("Set this as my current stage")).toBeTruthy();
  });

  it("renders the iris room pour on its root", () => {
    renderWithProviders(<MeditationStageDetailScreen />);

    expect(screen.UNSAFE_getByType(SafeAreaView).props.style).toEqual(roomVariables("iris").light);
  });

  it("renders the dark iris pour when the scheme is dark", () => {
    setScheme("dark");

    renderWithProviders(<MeditationStageDetailScreen />);

    expect(screen.UNSAFE_getByType(SafeAreaView).props.style).toEqual(roomVariables("iris").dark);
  });

  it("tints the mastery callout card with iris", () => {
    renderWithProviders(<MeditationStageDetailScreen />);

    // Exactly one card wears the iris tint - the mastery callout, converted
    // from `primary` because it is decorative, not a control state.
    expect(classNames().filter((c) => c.includes("hsl(var(--iris)/0.06)"))).toHaveLength(1);
    expect(classNames().filter((c) => c.includes("hsl(var(--iris)/0.30)"))).toHaveLength(1);
    expect(classNames().some((c) => c.includes("bg-primary/5"))).toBe(false);
  });
});
