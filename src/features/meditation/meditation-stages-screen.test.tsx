import { screen } from "@testing-library/react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MeditationStagesScreen from "@/src/features/meditation/meditation-stages-screen";
import { useMeditationProgramState } from "@/src/features/meditation/queries";
import { expectNeutralRoom } from "@/test/room-pour";
import { setScheme } from "@/test/color-scheme-mock";
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
    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
  });

  it("renders the dark iris pour when the scheme is dark", () => {
    setScheme("dark");

    renderWithProviders(<MeditationStagesScreen />);

    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
  });

  it("wears iris on the current-stage badge", () => {
    renderWithProviders(<MeditationStagesScreen />);

    // Decorative accent, so it follows the room hue - `primary` stays reserved
    // for interactive control states. It is small uppercase text, so the hue
    // arrives as `accent-ink` (iris darkened to clear AA, #368) rather than the
    // published `text-iris`, which is 3.33:1 on the surfaces iris pours.
    expect(screen.getByText("Where you are").props.className).toContain("text-accent-ink");
  });

  it("keeps the `be` milestone chips as untouched guests", () => {
    renderWithProviders(<MeditationStagesScreen />);

    // A cross-module reference, exactly like grounding's per-technique hues:
    // the room does not repaint it.
    const milestone = screen.getByText("Milestone One - Continuous attention to the breath");
    expect(milestone.props.className).toContain("text-be");
    expect(milestone.props.className).not.toContain("text-iris");
    // `accent-ink` is the room's hue, so sweeping the guest onto it would
    // repaint `be` as iris just as surely as `text-iris` would (#368).
    expect(milestone.props.className).not.toContain("text-accent-ink");
  });
});
