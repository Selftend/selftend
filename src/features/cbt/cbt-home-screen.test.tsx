import { fireEvent, screen, within } from "@testing-library/react-native";
import { router } from "expo-router";

import CbtHomeScreen from "./cbt-home-screen";
import {
  useThoughtRecordCount,
  useThoughtRecordCountSince,
  useThoughtRecords,
} from "@/src/features/cbt/queries";
import { useCbtInsights } from "@/src/features/cbt/use-cbt-insights";
import { useCbtProgram } from "@/src/features/cbt/use-cbt-program";
import { useGoals } from "@/src/features/goals/queries";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import {
  useUpdateShownButtonTours,
  useUpdateUserPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";

import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
  },
  usePathname: () => "/modules/cbt",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: {
      id: "user-1",
    },
  }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateShownButtonTours: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
  useUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/goals/queries", () => ({
  useGoals: jest.fn(),
}));

jest.mock("@/src/features/cbt/queries", () => ({
  useThoughtRecords: jest.fn(),
  useThoughtRecordCount: jest.fn(),
  useThoughtRecordCountSince: jest.fn(),
}));

jest.mock("@/src/features/recovery/queries", () => ({
  useRecoveryPlan: jest.fn(),
}));

jest.mock("@/src/features/cbt/use-cbt-insights", () => ({
  useCbtInsights: jest.fn(),
}));

jest.mock("@/src/features/cbt/use-cbt-program", () => ({
  useCbtProgram: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateShownButtonTours = useUpdateShownButtonTours as jest.MockedFunction<
  typeof useUpdateShownButtonTours
>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;
const mockUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
const mockUseThoughtRecords = useThoughtRecords as jest.MockedFunction<typeof useThoughtRecords>;
const mockUseThoughtRecordCount = useThoughtRecordCount as jest.MockedFunction<
  typeof useThoughtRecordCount
>;
const mockUseThoughtRecordCountSince = useThoughtRecordCountSince as jest.MockedFunction<
  typeof useThoughtRecordCountSince
>;
const mockUseRecoveryPlan = useRecoveryPlan as jest.MockedFunction<typeof useRecoveryPlan>;
const mockUseCbtInsights = useCbtInsights as jest.MockedFunction<typeof useCbtInsights>;
const mockUseCbtProgram = useCbtProgram as jest.MockedFunction<typeof useCbtProgram>;

const mutateAsync = jest.fn().mockResolvedValue(defaultUserPreferences);

function setupDefaultMocks() {
  jest.clearAllMocks();
  mutateAsync.mockResolvedValue(defaultUserPreferences);
  mockUseUpdateUserPreferences.mockReturnValue({
    isError: false,
    isPending: false,
    mutate: jest.fn(),
    mutateAsync,
  } as unknown as ReturnType<typeof useUpdateUserPreferences>);
  mockUseUpdateShownButtonTours.mockReturnValue({
    isPending: false,
    mutateAsync: jest.fn(),
  } as unknown as ReturnType<typeof useUpdateShownButtonTours>);
  mockUseGoals.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useGoals>);
  mockUseThoughtRecords.mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useThoughtRecords>);
  mockUseThoughtRecordCount.mockReturnValue({ data: 0 } as unknown as ReturnType<
    typeof useThoughtRecordCount
  >);
  mockUseThoughtRecordCountSince.mockReturnValue({ data: 0 } as unknown as ReturnType<
    typeof useThoughtRecordCountSince
  >);
  mockUseRecoveryPlan.mockReturnValue({
    data: null,
  } as unknown as ReturnType<typeof useRecoveryPlan>);
  mockUseCbtInsights.mockReturnValue({
    activityMoodLiftByCategory: [],
    angerPattern: null,
    beliefReviewSuggestions: [],
    exerciseMoodLift: null,
    exposureProgress: null,
    recurringThoughtSuggestions: [],
    selfCareTrend: null,
    distortionCounts: [],
  });
  mockUseCbtProgram.mockReturnValue({
    program: {
      status: "not_started",
      startedAt: null,
      summaryStats: {
        thoughtRecords: 0,
        activitiesCompleted: 0,
        goalsSet: 0,
        beliefsExamined: 0,
      },
      phaseIndex: 0,
      totalPhases: 5,
      isLastPhase: false,
      phase: null,
      phaseReady: false,
    },
    isLoading: false,
    isUpdating: false,
    abandonProgram: jest.fn(),
    advancePhase: jest.fn(),
    dismissProgramPrompt: jest.fn(),
    promptDismissedAt: null,
    startProgram: jest.fn(),
    showProgramPrompt: jest.fn(),
    replayProgram: jest.fn(),
  } as unknown as ReturnType<typeof useCbtProgram>);
}

describe("CbtHomeScreen onboarding", () => {
  beforeEach(setupDefaultMocks);

  it("does not show CBT onboarding until the info action is pressed", () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<CbtHomeScreen />);

    expect(screen.queryByText(/The CBT Toolkit/)).toBeNull();
  });

  it("shows the program start card and no concern guidance", () => {
    mockUseUserPreferences.mockReturnValue({
      data: defaultUserPreferences,
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<CbtHomeScreen />);

    expect(screen.getByText("Start program")).toBeTruthy();
    expect(screen.queryByText("Today check-in")).toBeNull();
    expect(screen.queryByText("Today")).toBeNull();
    expect(screen.queryByText("Mood summaries")).toBeNull();
    expect(screen.queryByText("Quick actions")).toBeNull();
    expect(screen.queryByText(/Suggested for/)).toBeNull();
  });

  it("hides a dismissed start card and restores it from the header program action", () => {
    const showProgramPrompt = jest.fn();
    mockUseUserPreferences.mockReturnValue({
      data: defaultUserPreferences,
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
    mockUseCbtProgram.mockReturnValue({
      program: {
        status: "not_started",
        startedAt: null,
        summaryStats: {
          thoughtRecords: 0,
          activitiesCompleted: 0,
          goalsSet: 0,
          beliefsExamined: 0,
        },
        phaseIndex: 0,
        totalPhases: 5,
        isLastPhase: false,
        phase: null,
        phaseReady: false,
      },
      isLoading: false,
      isUpdating: false,
      abandonProgram: jest.fn(),
      advancePhase: jest.fn(),
      dismissProgramPrompt: jest.fn(),
      promptDismissedAt: "2026-05-22T09:00:00.000Z",
      replayProgram: jest.fn(),
      showProgramPrompt,
      startProgram: jest.fn(),
    } as unknown as ReturnType<typeof useCbtProgram>);

    renderWithProviders(<CbtHomeScreen />);

    expect(screen.queryByText("Start program")).toBeNull();
    fireEvent.press(screen.getByLabelText("Show the CBT program invitation"));
    expect(showProgramPrompt).toHaveBeenCalled();
  });

  it("renders three PillarCards iterating PILLAR_STRATEGIES", () => {
    mockUseUserPreferences.mockReturnValue({
      data: defaultUserPreferences,
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<CbtHomeScreen />);

    expect(screen.getByText("Think")).toBeTruthy();
    expect(screen.getByText("Act")).toBeTruthy();
    expect(screen.getByText("Be")).toBeTruthy();
  });

  it("renders full title on the quiet shell with no book credit (#493, #494, #500, #733)", () => {
    mockUseUserPreferences.mockReturnValue({
      data: defaultUserPreferences,
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<CbtHomeScreen />);

    expect(screen.getByText("Cognitive Behavioural Therapy")).toBeTruthy();
    // This used to pin the pour to the primary violet rather than to "some
    // gradient", so a hue swap back to think failed here. #733 deleted the field
    // outright, and CBT's colour identity WAS that pour - the consequence is
    // raised on #691. What is left to assert is that the shell renders no
    // gradient at all, which module-home-header.test.tsx owns centrally.
    expect(screen.queryByText(/inspired by/i)).toBeNull();
  });

  it("renders shared-tool pills beneath each PillarCard", () => {
    mockUseUserPreferences.mockReturnValue({
      data: defaultUserPreferences,
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<CbtHomeScreen />);

    // One heading per pillar that has shared tools - all three do. It reads
    // "Shared tools", not "Uses these shared tools": the row's label sits beside
    // the section eyebrows and a sentence there is a different rank of thing.
    expect(screen.getAllByText("Shared tools")).toHaveLength(3);
    // Think pillar shared tools
    expect(screen.getByText("Journal")).toBeTruthy();
    expect(screen.getByText("Gratitude log")).toBeTruthy();
    // Act pillar shared tools
    expect(screen.getByText("Habit tracking")).toBeTruthy();
    // Be pillar shared tools
    expect(screen.getByText("Breathing")).toBeTruthy();
    expect(screen.getByText("Meditation")).toBeTruthy();
  });

  it("confirms before abandoning an in-progress program", () => {
    const abandonProgram = jest.fn();
    mockUseUserPreferences.mockReturnValue({
      data: defaultUserPreferences,
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
    mockUseCbtProgram.mockReturnValue({
      program: {
        status: "in_progress",
        startedAt: "2026-05-01T00:00:00.000Z",
        summaryStats: {
          thoughtRecords: 0,
          activitiesCompleted: 0,
          goalsSet: 0,
          beliefsExamined: 0,
        },
        phaseIndex: 0,
        totalPhases: 5,
        isLastPhase: false,
        phase: {
          key: "assessment",
          themeLabelKey: "program.weeks.assessment.title",
          themeSubKey: "program.weeks.assessment.sub",
          themeDescKey: "program.weeks.assessment.description",
          milestones: [
            {
              key: "setGoals",
              labelKey: "program.tasks.setGoals",
              route: "/modules/cbt/goals/new",
              current: 0,
              target: 1,
              done: false,
            },
          ],
          dailyPractice: null,
        },
        phaseReady: false,
      },
      isLoading: false,
      isUpdating: false,
      abandonProgram,
      advancePhase: jest.fn(),
      dismissProgramPrompt: jest.fn(),
      promptDismissedAt: null,
      replayProgram: jest.fn(),
      showProgramPrompt: jest.fn(),
      startProgram: jest.fn(),
    } as unknown as ReturnType<typeof useCbtProgram>);

    renderWithProviders(<CbtHomeScreen />);

    fireEvent.press(screen.getByLabelText("Program options"));
    fireEvent.press(screen.getByText("Abandon program"));
    expect(screen.getByText("Abandon this program?")).toBeTruthy();

    fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    expect(abandonProgram).toHaveBeenCalled();
  });
});

/**
 * ☠️☠️ Nothing in either suite used to touch this screen's layout, and no
 * end-to-end test reaches CBT home at all - both CBT specs navigate straight to
 * the form route. The reorder, the new-record button and the foot-row deletion
 * would all have landed with nothing going red. This block is what makes them
 * observable.
 */
describe("CbtHomeScreen layout (#1386)", () => {
  const push = router.push as jest.Mock;

  /**
   * Every rendered string in tree order. Reduced to strings BEFORE any
   * assertion touches it: jest's pretty-printer walks React nodes and trips
   * `test/setup.js`'s console guard on React's deprecated `isMounted` getter,
   * which turns a legible diff into an unrelated warning.
   */
  function renderedText(): string[] {
    return screen.UNSAFE_root.findAll(() => true).flatMap((node) =>
      (node.children as unknown[]).filter((child): child is string => typeof child === "string"),
    );
  }

  function orderOf(...needles: string[]): number[] {
    const texts = renderedText();
    return needles.map((needle) => texts.findIndex((text) => text.includes(needle)));
  }

  function goal(id: string) {
    return {
      id,
      userId: "user-1",
      title: `goal ${id}`,
      description: "",
      lifeDomain: "health",
      goalType: "outcome",
      targetDate: null,
      status: "active",
      valueKey: null,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    };
  }

  function thoughtRecord(id: string, thought: string) {
    return {
      id,
      userId: "user-1",
      situation: "",
      nats: [{ text: thought, beliefRating: 85, isHotThought: true }],
      emotions: [],
      emotionIntensityBefore: null,
      distortions: [],
      evidenceFor: [],
      evidenceAgainst: [],
      balancedThought: "",
      emotionIntensityAfter: null,
      outcomeNotes: "",
      beliefAfter: 40,
      createdAt: "2026-05-01T09:00:00.000Z",
      createdOffsetMinutes: 0,
      dayKey: "2026-05-01",
      updatedAt: "2026-05-02T09:00:00.000Z",
      archivedAt: null,
    };
  }

  function fillTheScreen() {
    mockUseGoals.mockReturnValue({ data: [goal("g1")] } as unknown as ReturnType<typeof useGoals>);
    mockUseThoughtRecords.mockReturnValue({
      data: [
        thoughtRecord("r1", "first thought"),
        thoughtRecord("r2", "second thought"),
        thoughtRecord("r3", "third thought"),
        thoughtRecord("r4", "fourth thought"),
      ],
    } as unknown as ReturnType<typeof useThoughtRecords>);
    mockUseRecoveryPlan.mockReturnValue({
      data: { personalSlogan: "one step at a time" },
    } as unknown as ReturnType<typeof useRecoveryPlan>);
    mockUseCbtInsights.mockReturnValue({
      activityMoodLiftByCategory: [],
      angerPattern: null,
      beliefReviewSuggestions: [],
      exerciseMoodLift: null,
      exposureProgress: null,
      recurringThoughtSuggestions: [],
      selfCareTrend: null,
      distortionCounts: [{ key: "catastrophizing", count: 3 }],
    } as unknown as ReturnType<typeof useCbtInsights>);
  }

  beforeEach(() => {
    setupDefaultMocks();
    mockUseUserPreferences.mockReturnValue({
      data: defaultUserPreferences,
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
  });

  it("renders the blocks in order, with recent records above insights", () => {
    fillTheScreen();
    renderWithProviders(<CbtHomeScreen />);

    const positions = orderOf(
      "Cognitive Behavioural Therapy",
      "New thought record",
      "Start program",
      "Your slogan",
      "Active goals",
      "Recent thought records",
      "Insights",
      "framework",
      "Review",
      "Use urgent support for urgent risk",
    );

    expect(positions.filter((position) => position < 0)).toEqual([]);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("opens the new-record screen from an inline button under the header", () => {
    renderWithProviders(<CbtHomeScreen />);

    fireEvent.press(screen.getByText("New thought record"));
    expect(push).toHaveBeenCalledWith("/modules/cbt/new");
  });

  it("still routes to the new record from the Think pillar's catalogue entry", () => {
    renderWithProviders(<CbtHomeScreen />);

    fireEvent.press(screen.getByText("Thought Records"));
    expect(push).toHaveBeenCalledWith("/modules/cbt/new");
  });

  /**
   * The count used to appear three times and the door twice. What is left is
   * one door, rendered as the recent-records section's action.
   */
  it("has exactly one door to the record history, and no foot row", () => {
    fillTheScreen();
    renderWithProviders(<CbtHomeScreen />);

    expect(screen.queryByText("Record history")).toBeNull();
    expect(screen.getAllByText("Show all records")).toHaveLength(1);

    fireEvent.press(screen.getByText("Show all records"));
    expect(push).toHaveBeenCalledWith("/modules/cbt/history");
  });

  it("sends both doors through the shared show-all link, in one vocabulary", () => {
    fillTheScreen();
    renderWithProviders(<CbtHomeScreen />);

    expect(screen.getByText("Show all goals")).toBeTruthy();
    expect(screen.getByText("Show all records")).toBeTruthy();
    expect(screen.queryByText("See all")).toBeNull();
  });

  it("renders three recent records with their belief pair, not one with a balanced thought", () => {
    fillTheScreen();
    renderWithProviders(<CbtHomeScreen />);

    expect(screen.getByText("first thought")).toBeTruthy();
    expect(screen.getByText("second thought")).toBeTruthy();
    expect(screen.getByText("third thought")).toBeTruthy();
    expect(screen.queryByText("fourth thought")).toBeNull();
    expect(screen.getAllByText("Belief 85 -> 40")).toHaveLength(3);
  });

  it("keeps the personal slogan card, the active goals and the programme card", () => {
    fillTheScreen();
    renderWithProviders(<CbtHomeScreen />);

    expect(screen.getByText('"one step at a time"')).toBeTruthy();
    expect(screen.getByText("goal g1")).toBeTruthy();
    expect(screen.getByText("Start program")).toBeTruthy();
  });

  it("gives every section heading a real level-3 heading role", () => {
    fillTheScreen();
    renderWithProviders(<CbtHomeScreen />);

    for (const title of ["Active goals", "Recent thought records", "Insights", "Review"]) {
      const heading = screen.getByText(title);
      expect(heading.props.role ?? heading.props.accessibilityRole).toBe("heading");
      // `Text variant="h2"` sets `aria-level` as the STRING "2" while `Section`
      // sets the NUMBER 3 - a real inconsistency in the tree, so coerce.
      expect(Number(heading.props["aria-level"])).toBe(3);
    }
  });

  /**
   * ⚠️ The one exception, asserted rather than argued: the framework heading is
   * a real heading at level 2, because it INTRODUCES the level-3 sections rather
   * than being one. Flattening it would leave the page with no outline. Pinned
   * so the exception cannot be quietly flattened, nor quietly lose its role.
   */
  it("keeps the framework heading a real heading, one level above the sections", () => {
    fillTheScreen();
    renderWithProviders(<CbtHomeScreen />);

    const framework = screen.getByText(/framework/);
    expect(framework.props.role ?? framework.props.accessibilityRole).toBe("heading");
    expect(Number(framework.props["aria-level"])).toBe(2);
  });

  /**
   * ☠️ The hairline rule is a runtime fact: the blocks above the first section
   * are conditional. A user with nothing logged must not meet a stray rule that
   * reads as an underline for the header.
   */
  it("gives a user with nothing logged a screen that makes sense, and no empty-state copy", () => {
    renderWithProviders(<CbtHomeScreen />);

    expect(screen.getByText("Cognitive Behavioural Therapy")).toBeTruthy();
    expect(screen.getByText("New thought record")).toBeTruthy();
    expect(screen.getByText("Start program")).toBeTruthy();
    expect(screen.getByText(/framework/)).toBeTruthy();
    expect(screen.getByText("Think")).toBeTruthy();
    expect(screen.getByText("Review")).toBeTruthy();
    expect(screen.getByText("Use urgent support for urgent risk")).toBeTruthy();

    // The self-hiding sections stay hidden and nothing apologises for them: an
    // overview is not a list.
    expect(screen.queryByText("Recent thought records")).toBeNull();
    expect(screen.queryByText("Active goals")).toBeNull();
    expect(screen.queryByText("Insights")).toBeNull();

    // Only the framework and Review render a `Section` here, against five when
    // the screen is full - which is what makes "the first section" a runtime
    // fact rather than a source position. Whether each one draws its rule is
    // `deriveSectionRules`' contract, asserted directly in
    // `derive-cbt-home-view.test.ts`; a className never becomes a style a
    // rendered node exposes, so it cannot be read back here.
    expect(screen.getAllByTestId("section")).toHaveLength(2);
  });

  it("renders one section per visible block once the screen is full", () => {
    fillTheScreen();
    renderWithProviders(<CbtHomeScreen />);

    expect(screen.getAllByTestId("section")).toHaveLength(5);
  });
});

/**
 * The header stat run and the thinking-pattern bars (#1387). Like the layout
 * block above, nothing else in either suite would notice these: no e2e reaches
 * CBT home at all.
 */
describe("CbtHomeScreen header stats and pattern bars (#1387)", () => {
  const push = router.push as jest.Mock;

  /** A record created NOW, carrying the full belief pair. */
  function pairedRecord(id: string, beliefBefore: number, beliefAfter: number) {
    const nowIso = new Date().toISOString();
    return {
      id,
      userId: "user-1",
      situation: "",
      nats: [{ text: `thought ${id}`, beliefRating: beliefBefore, isHotThought: true }],
      emotions: [],
      emotionIntensityBefore: null,
      distortions: [],
      evidenceFor: [],
      evidenceAgainst: [],
      balancedThought: "",
      emotionIntensityAfter: null,
      outcomeNotes: "",
      beliefAfter,
      createdAt: nowIso,
      createdOffsetMinutes: 0,
      dayKey: nowIso.slice(0, 10),
      updatedAt: nowIso,
      archivedAt: null,
    };
  }

  beforeEach(() => {
    setupDefaultMocks();
    mockUseUserPreferences.mockReturnValue({
      data: defaultUserPreferences,
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
  });

  it("renders the lifetime count, the month count and the signed mean belief shift", () => {
    mockUseThoughtRecordCount.mockReturnValue({ data: 24 } as unknown as ReturnType<
      typeof useThoughtRecordCount
    >);
    mockUseThoughtRecordCountSince.mockReturnValue({ data: 4 } as unknown as ReturnType<
      typeof useThoughtRecordCountSince
    >);
    mockUseThoughtRecords.mockReturnValue({
      // Shifts -45 and -25 -> mean -35.
      data: [pairedRecord("r1", 85, 40), pairedRecord("r2", 60, 35)],
    } as unknown as ReturnType<typeof useThoughtRecords>);

    renderWithProviders(<CbtHomeScreen />);

    // The composed stat string, value + label, as HeaderStats joins them.
    expect(screen.getByText("24 thought records")).toBeTruthy();
    expect(screen.getByText("4 this month")).toBeTruthy();
    expect(screen.getByText("-35 points mean belief shift")).toBeTruthy();
  });

  it("omits the belief-shift stat entirely when no record carries both numbers", () => {
    mockUseThoughtRecordCount.mockReturnValue({ data: 2 } as unknown as ReturnType<
      typeof useThoughtRecordCount
    >);
    mockUseThoughtRecordCountSince.mockReturnValue({ data: 2 } as unknown as ReturnType<
      typeof useThoughtRecordCountSince
    >);

    renderWithProviders(<CbtHomeScreen />);

    // Present stats still render...
    expect(screen.getByText("2 thought records")).toBeTruthy();
    expect(screen.getByText("2 this month")).toBeTruthy();
    // ...but nothing stands in for the shift: no label, no dash-shaped value.
    expect(screen.queryByText(/mean belief shift/)).toBeNull();
  });

  it("shows a user with two records their pattern counts, with every card kind silent", () => {
    mockUseThoughtRecords.mockReturnValue({
      data: [pairedRecord("r1", 85, 40), pairedRecord("r2", 60, 35)],
    } as unknown as ReturnType<typeof useThoughtRecords>);
    mockUseCbtInsights.mockReturnValue({
      activityMoodLiftByCategory: [],
      angerPattern: null,
      beliefReviewSuggestions: [],
      exerciseMoodLift: null,
      exposureProgress: null,
      recurringThoughtSuggestions: [],
      selfCareTrend: null,
      distortionCounts: [
        { key: "catastrophizing", count: 2 },
        { key: "mind-reading", count: 1 },
      ],
    } as unknown as ReturnType<typeof useCbtInsights>);

    renderWithProviders(<CbtHomeScreen />);

    expect(screen.getByText("Insights")).toBeTruthy();
    expect(screen.getByText("Catastrophising")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("Mind reading")).toBeTruthy();
    // The retired prose card must not resurface around the bars.
    expect(screen.queryByText(/Top distortion/)).toBeNull();
    expect(screen.queryByText(/Other recurring patterns/)).toBeNull();
  });

  it("keeps the other insight kinds rendering beside the bars, each on its own datum", () => {
    mockUseCbtInsights.mockReturnValue({
      activityMoodLiftByCategory: [],
      angerPattern: null,
      beliefReviewSuggestions: [],
      exerciseMoodLift: { withExercise: 7.2, withoutExercise: 5.1 },
      exposureProgress: null,
      recurringThoughtSuggestions: [],
      selfCareTrend: null,
      distortionCounts: [{ key: "catastrophizing", count: 2 }],
    } as unknown as ReturnType<typeof useCbtInsights>);

    renderWithProviders(<CbtHomeScreen />);

    expect(screen.getByText("Catastrophising")).toBeTruthy();
    expect(screen.getByText(/Average mood on exercise days/)).toBeTruthy();
  });

  it("doors the insights section to the patterns reference without asserting a count", () => {
    mockUseCbtInsights.mockReturnValue({
      activityMoodLiftByCategory: [],
      angerPattern: null,
      beliefReviewSuggestions: [],
      exerciseMoodLift: null,
      exposureProgress: null,
      recurringThoughtSuggestions: [],
      selfCareTrend: null,
      distortionCounts: [{ key: "catastrophizing", count: 2 }],
    } as unknown as ReturnType<typeof useCbtInsights>);

    renderWithProviders(<CbtHomeScreen />);

    // Two doors to the same reference, deliberately: the Think pillar's
    // catalogue entry and the section's reading suggestion (#1229's
    // catalogue-versus-action rule). Neither says a number.
    expect(screen.getAllByText("Thinking Patterns")).toHaveLength(2);
    expect(screen.queryByText(/twelve/i)).toBeNull();

    const insightsSection = screen
      .getAllByTestId("section")
      .find((section) => within(section).queryByText("Insights"));
    expect(insightsSection).toBeTruthy();
    fireEvent.press(within(insightsSection!).getByText("Thinking Patterns"));
    expect(push).toHaveBeenCalledWith("/modules/cbt/learn");
  });
});
