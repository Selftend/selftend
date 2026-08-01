import { screen } from "@testing-library/react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MeditationStageDetailScreen from "@/src/features/meditation/meditation-stage-detail-screen";
import { useMeditationProgramState } from "@/src/features/meditation/queries";
import { expectNeutralRoom } from "@/test/room-pour";
import { setScheme } from "@/test/color-scheme-mock";
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

const mockUseMeditationProgramState = useMeditationProgramState as jest.MockedFunction<
  typeof useMeditationProgramState
>;

/** Every rendered view's class list, for asserting on tint utilities. */
const viewClassNames = () =>
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

    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
  });

  it("renders the dark iris pour when the scheme is dark", () => {
    setScheme("dark");

    renderWithProviders(<MeditationStageDetailScreen />);

    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
  });

  // INVERTED by #588: the mastery callout wore the room's iris because it is
  // "decorative, not a control state" - and decorative is exactly what goes
  // neutral. Fails on the old behaviour, which had one `var(--iris)` card here.
  it("carries no module tint on the mastery callout", () => {
    renderWithProviders(<MeditationStageDetailScreen />);

    expect(viewClassNames().filter((c) => c.includes("var(--iris)"))).toEqual([]);
  });
});
