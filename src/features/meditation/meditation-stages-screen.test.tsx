import { screen } from "@testing-library/react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";

import MeditationStagesScreen from "@/src/features/meditation/meditation-stages-screen";
import { useMeditationProgramState } from "@/src/features/meditation/queries";
import { roomVariables } from "@/src/lib/module-room";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/tools/meditation/stages",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationProgramState: jest.fn(),
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

const setCurrentStage = (currentStage: number | undefined) =>
  mockUseMeditationProgramState.mockReturnValue({
    data: currentStage === undefined ? undefined : { currentStage },
  } as unknown as ReturnType<typeof useMeditationProgramState>);

describe("MeditationStagesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setScheme("light");
    setCurrentStage(3);
  });

  it("renders the header, the phase headings, and every stage", () => {
    renderWithProviders(<MeditationStagesScreen />);

    expect(screen.getByRole("heading", { name: "The ten stages" })).toBeTruthy();
    expect(screen.getByText("Ten stages divided by four milestones.")).toBeTruthy();
    expect(screen.getByText("Novice - Stages 1 to 3")).toBeTruthy();
    expect(screen.getByText("Adept - Stages 8 to 10")).toBeTruthy();
    // Ten numbered stage badges, one per stage.
    for (const n of [1, 5, 10]) expect(screen.getByText(String(n))).toBeTruthy();
  });

  it("renders the iris room pour on its root", () => {
    renderWithProviders(<MeditationStagesScreen />);

    // The root carries the iris room re-pour; a wrong or missing room fails here.
    expect(screen.UNSAFE_getByType(SafeAreaView).props.style).toEqual(roomVariables("iris").light);
  });

  it("renders the dark iris pour when the scheme is dark", () => {
    setScheme("dark");

    renderWithProviders(<MeditationStagesScreen />);

    expect(screen.UNSAFE_getByType(SafeAreaView).props.style).toEqual(roomVariables("iris").dark);
  });

  it("wears iris on the current-stage badge", () => {
    renderWithProviders(<MeditationStagesScreen />);

    // Decorative accent, so it follows the room hue - `primary` stays reserved
    // for interactive control states.
    expect(screen.getByText("Where you are").props.className).toContain("text-iris");
  });

  it("keeps the `be` milestone chips as untouched guests", () => {
    renderWithProviders(<MeditationStagesScreen />);

    // A cross-module reference, exactly like grounding's per-technique hues:
    // the room does not repaint it.
    const milestone = screen.getByText("Milestone One - Continuous attention to the breath");
    expect(milestone.props.className).toContain("text-be");
    expect(milestone.props.className).not.toContain("text-iris");
  });
});
