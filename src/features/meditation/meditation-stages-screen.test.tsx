import { fireEvent, screen, within } from "@testing-library/react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MeditationStagesScreen from "@/src/features/meditation/meditation-stages-screen";
import {
  useMeditationProgramState,
  useUpsertMeditationProgramState,
} from "@/src/features/meditation/queries";
import { expectNeutralRoom } from "@/test/room-pour";
import { setScheme } from "@/test/color-scheme-mock";
import { renderWithProviders } from "@/test/render-with-providers";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
  },
  usePathname: () => "/tools/meditation/stages",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationProgramState: jest.fn(),
  useUpsertMeditationProgramState: jest.fn(),
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

const mockUseMeditationProgramState = useMeditationProgramState as jest.MockedFunction<
  typeof useMeditationProgramState
>;
const mockUseUpsert = useUpsertMeditationProgramState as jest.MockedFunction<
  typeof useUpsertMeditationProgramState
>;

const mockMutate = jest.fn();

const setCurrentStage = (currentStage: number | undefined) =>
  mockUseMeditationProgramState.mockReturnValue({
    data: currentStage === undefined ? undefined : { currentStage },
  } as unknown as ReturnType<typeof useMeditationProgramState>);

const setUpsert = (isPending = false) =>
  mockUseUpsert.mockReturnValue({ mutate: mockMutate, isPending } as unknown as ReturnType<
    typeof useUpsertMeditationProgramState
  >);

/** The row's Pressable, which carries the expanded state and the toggle. */
const row = (n: number) => screen.getByTestId(`stage-row-${n}`);

describe("MeditationStagesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setScheme("light");
    setCurrentStage(3);
    setUpsert();
  });

  it("renders the header, the four band headings, and every stage", () => {
    renderWithProviders(<MeditationStagesScreen />);

    expect(screen.getByRole("heading", { name: "The ten stages" })).toBeTruthy();
    expect(screen.getByText("Novice - Stages 1 to 3")).toBeTruthy();
    expect(screen.getByText("Skilled - Stages 4 to 6")).toBeTruthy();
    expect(screen.getByText("Transition - Stage 7")).toBeTruthy();
    expect(screen.getByText("Adept - Stages 8 to 10")).toBeTruthy();
    // Ten numbered discs, one per stage.
    for (const n of [1, 5, 10]) expect(screen.getByText(String(n))).toBeTruthy();
  });

  it("tells nobody they are behind", () => {
    renderWithProviders(<MeditationStagesScreen />);

    // The drawn subtitle ends "- you are not behind": the product advertising
    // its own restraint (#711), reassuring against a punishment it does not
    // have. The two clauses that are the record stay.
    expect(screen.getByText("Four milestones. A single sit can move between stages.")).toBeTruthy();
    expect(screen.queryByText(/behind/i)).toBeNull();
  });

  it("renders the four milestone bands between the stages they follow", () => {
    renderWithProviders(<MeditationStagesScreen />);

    expect(screen.getByText("Milestone One - Continuous attention to the breath")).toBeTruthy();
    expect(screen.getByText("Milestone Two - Sustained exclusive focus")).toBeTruthy();
    expect(screen.getByText("Milestone Three - Effortless stability of attention")).toBeTruthy();
    expect(screen.getByText("Milestone Four - Persistence of an adept's qualities")).toBeTruthy();
  });

  it("renders the iris room pour on its root", () => {
    renderWithProviders(<MeditationStagesScreen />);

    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
  });

  it("renders the dark iris pour when the scheme is dark", () => {
    setScheme("dark");

    renderWithProviders(<MeditationStagesScreen />);

    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
  });

  it("carries no module hue on the milestone chips", () => {
    renderWithProviders(<MeditationStagesScreen />);

    const chip = screen.getByText("Milestone One - Continuous attention to the breath");
    const ancestorClasses: string[] = [];
    for (let node = chip.parent; node; node = node.parent) {
      if (typeof node.props?.className === "string") ancestorClasses.push(node.props.className);
    }
    // The design fills these `iris/0.07` and inks them `hsl(var(--iris))` - a
    // wash far under 3:1 under text measured at 3.81:1.
    expect(ancestorClasses.some((c) => c.includes("bg-iris"))).toBe(false);
    expect(ancestorClasses.some((c) => c.includes("bg-muted"))).toBe(true);
  });

  describe("expanding in place", () => {
    it("starts with every stage collapsed", () => {
      renderWithProviders(<MeditationStagesScreen />);

      expect(row(1).props.accessibilityState?.expanded).toBe(false);
      expect(screen.queryByText("Goal")).toBeNull();
    });

    it("expands a stage where it sits, without navigating", () => {
      renderWithProviders(<MeditationStagesScreen />);

      fireEvent.press(row(1));

      expect(row(1).props.accessibilityState?.expanded).toBe(true);
      expect(screen.getByText("Goal")).toBeTruthy();
      expect(screen.getByText("Obstacles")).toBeTruthy();
      expect(screen.getByText("Mastery")).toBeTruthy();
      expect(screen.getByText("Develop a regular, consistent meditation practice.")).toBeTruthy();
      // Reading a stage used to be a round trip through a detail screen.
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("unmounts the expansion when it closes rather than hiding it", () => {
      // A hidden-but-mounted subtree keeps its button in the tab order, so ten
      // collapsed stages would leave ten invisible "Set as my current stage"
      // buttons for a keyboard user to walk through.
      renderWithProviders(<MeditationStagesScreen />);

      fireEvent.press(row(1));
      expect(screen.getByText("Set as my current stage")).toBeTruthy();

      fireEvent.press(row(1));
      expect(screen.queryByText("Set as my current stage")).toBeNull();
      expect(screen.queryByText("Goal")).toBeNull();
    });

    it("keeps one stage open at a time", () => {
      // Two expansions push the rest of the spine off the screen, and the point
      // of a spine is that it reads at a glance.
      renderWithProviders(<MeditationStagesScreen />);

      fireEvent.press(row(1));
      fireEvent.press(row(2));

      expect(row(1).props.accessibilityState?.expanded).toBe(false);
      expect(row(2).props.accessibilityState?.expanded).toBe(true);
      expect(screen.getAllByText("Goal")).toHaveLength(1);
    });

    it("swaps the chevron glyph instead of rotating one", () => {
      // #716 settled that a disclosure chevron is a glyph swap; the design
      // animates a 200ms rotate, which is exactly the motion that then has to be
      // suppressed again under reduce-motion.
      renderWithProviders(<MeditationStagesScreen />);

      expect(within(row(1)).UNSAFE_queryAllByProps({ name: "expand-more" }).length).toBeGreaterThan(
        0,
      );
      expect(within(row(1)).UNSAFE_queryAllByProps({ name: "expand-less" })).toHaveLength(0);

      fireEvent.press(row(1));

      // The glyph SWAPS - both halves matter. A rotation would leave
      // `expand-more` in place and add a transform, which passes a
      // "chevron points up" check that only looks at the second line.
      expect(within(row(1)).UNSAFE_queryAllByProps({ name: "expand-less" }).length).toBeGreaterThan(
        0,
      );
      expect(within(row(1)).UNSAFE_queryAllByProps({ name: "expand-more" })).toHaveLength(0);
      for (const icon of within(row(1)).UNSAFE_queryAllByProps({ name: "expand-less" })) {
        expect(icon.props.style?.transform).toBeUndefined();
      }
    });
  });

  describe("the declared stage", () => {
    it("marks the current stage without relying on colour", () => {
      renderWithProviders(<MeditationStagesScreen />);

      // Filled disc versus outlined is a luminance and shape difference, so it
      // survives greyscale and every CVD - the disc carries real state.
      const currentDisc = screen.getByText("3");
      expect(currentDisc.props.className).toContain("text-primary-foreground");
      const otherDisc = screen.getByText("4");
      expect(otherDisc.props.className).toContain("text-muted-foreground");
      // And the pill says it in words.
      expect(screen.getByText("Where you are")).toBeTruthy();
    });

    it("inks the pill so it clears AA", () => {
      renderWithProviders(<MeditationStagesScreen />);

      expect(screen.getByText("Where you are").props.className).toContain("text-primary-ink");
    });

    it("changes the stage only when the button is pressed", () => {
      renderWithProviders(<MeditationStagesScreen />);

      // Expanding, reading and collapsing must not move the declared stage: a
      // product that decides which stage a practice has reached is grading it.
      fireEvent.press(row(7));
      fireEvent.press(row(7));
      expect(mockMutate).not.toHaveBeenCalled();

      fireEvent.press(row(7));
      fireEvent.press(screen.getByText("Set as my current stage"));
      expect(mockMutate).toHaveBeenCalledWith({ currentStage: 7 });
    });

    it("offers no set-current button on the stage that already is current", () => {
      renderWithProviders(<MeditationStagesScreen />);

      fireEvent.press(row(3));

      expect(screen.getByText("This is your current stage.")).toBeTruthy();
      expect(screen.queryByText("Set as my current stage")).toBeNull();
    });

    it("disables the button while the write is in flight", () => {
      setUpsert(true);

      renderWithProviders(<MeditationStagesScreen />);
      fireEvent.press(row(7));

      const button = screen.getByRole("button", { name: "Set as my current stage" });
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it("defaults to stage one when no programme state has loaded", () => {
      setCurrentStage(undefined);

      renderWithProviders(<MeditationStagesScreen />);

      expect(screen.getByText("1").props.className).toContain("text-primary-foreground");
    });
  });

  it("folds skills and reflection prompts into the expansion", () => {
    // #851 deleted the stage detail screen; the two blocks that lived only
    // there now render in the expansion, so nothing is stranded and nothing
    // navigates.
    renderWithProviders(<MeditationStagesScreen />);

    fireEvent.press(row(5));

    expect(screen.getByText("Skills and methods")).toBeTruthy();
    expect(screen.getByText(/Vigilant introspective awareness/)).toBeTruthy();
    expect(screen.getByText("Reflection prompts at this stage")).toBeTruthy();
    expect(screen.getByText(/Did you run a body scan today\?/)).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
