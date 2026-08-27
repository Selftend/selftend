import { fireEvent, screen } from "@testing-library/react-native";

import { router } from "expo-router";

import ActHomeScreen from "./act-home-screen";
import {
  useChoicePointCount,
  useCommittedActionCount,
  useDefusionLogCount,
  useDefusionLogs,
} from "@/src/features/act/queries";
import { useActProgram } from "@/src/features/act/use-act-program";
import { useUpdateShownButtonTours, useUserPreferences } from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
  },
  usePathname: () => "/modules/act",
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

jest.mock("@/src/features/act/queries", () => ({
  useDefusionLogs: jest.fn(),
  useChoicePointCount: jest.fn(),
  useDefusionLogCount: jest.fn(),
  useCommittedActionCount: jest.fn(),
}));

jest.mock("@/src/features/act/use-act-program", () => ({
  useActProgram: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateShownButtonTours = useUpdateShownButtonTours as jest.MockedFunction<
  typeof useUpdateShownButtonTours
>;
const mockUseDefusionLogs = useDefusionLogs as jest.MockedFunction<typeof useDefusionLogs>;
const mockUseActProgram = useActProgram as jest.MockedFunction<typeof useActProgram>;
const mockUseChoicePointCount = useChoicePointCount as jest.MockedFunction<
  typeof useChoicePointCount
>;
const mockUseDefusionLogCount = useDefusionLogCount as jest.MockedFunction<
  typeof useDefusionLogCount
>;
const mockUseCommittedActionCount = useCommittedActionCount as jest.MockedFunction<
  typeof useCommittedActionCount
>;

/** The three head counts behind the header's stat run. */
function setCounts({
  choicePoints,
  defusionLogs,
  committedActions,
}: {
  choicePoints?: number;
  defusionLogs?: number;
  committedActions?: number;
}) {
  mockUseChoicePointCount.mockReturnValue({ data: choicePoints } as unknown as ReturnType<
    typeof useChoicePointCount
  >);
  mockUseDefusionLogCount.mockReturnValue({ data: defusionLogs } as unknown as ReturnType<
    typeof useDefusionLogCount
  >);
  mockUseCommittedActionCount.mockReturnValue({ data: committedActions } as unknown as ReturnType<
    typeof useCommittedActionCount
  >);
}

const defaultActProgram = {
  status: "not_started" as const,
  startedAt: null,
  summaryStats: {
    choicePoints: 0,
    defusionLogs: 0,
    expansionLogs: 0,
    committedActions: 0,
  },
  phaseIndex: 0,
  totalPhases: 6,
  isLastPhase: false,
  phase: null,
  phaseReady: false,
};

describe("ActHomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpdateShownButtonTours.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useUpdateShownButtonTours>);
    mockUseUserPreferences.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
    mockUseDefusionLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useDefusionLogs>);
    setCounts({ choicePoints: 0, defusionLogs: 0, committedActions: 0 });
    mockUseActProgram.mockReturnValue({
      program: defaultActProgram,
      isLoading: false,
      isUpdating: false,
      abandonProgram: jest.fn(),
      advancePhase: jest.fn(),
      dismissProgramPrompt: jest.fn(),
      dismissGraduation: jest.fn(),
      promptDismissedAt: null,
      graduationDismissedAt: null,
      startProgram: jest.fn(),
      showProgramPrompt: jest.fn(),
      replayProgram: jest.fn(),
    } as unknown as ReturnType<typeof useActProgram>);
  });

  it("renders the four ACT pillars with their tools", () => {
    renderWithProviders(<ActHomeScreen />);

    // Pillar headings (sourced from pillars copy)
    expect(screen.getByText("Build a foundation")).toBeTruthy();
    expect(screen.getByText("Be present")).toBeTruthy();
    expect(screen.getByText("Open up")).toBeTruthy();
    expect(screen.getByText("Do what matters")).toBeTruthy();

    // Foundation tools, surfaced on the home screen for the first time
    expect(screen.getByText("Choice point")).toBeTruthy();
    expect(screen.getByText("Drop anchor")).toBeTruthy();

    // The six principle tools, now grouped under their pillars
    expect(screen.getByText("Defusion")).toBeTruthy();
    expect(screen.getByText("Acceptance")).toBeTruthy();
    expect(screen.getByText("Connection")).toBeTruthy();
    expect(screen.getByText("Observing Self")).toBeTruthy();
    expect(screen.getByText("Values")).toBeTruthy();
    expect(screen.getByText("Committed Action")).toBeTruthy();
  });

  it("navigates to the Choice Point tool from the Foundation pillar", () => {
    renderWithProviders(<ActHomeScreen />);

    fireEvent.press(screen.getByText("Choice point"));

    expect(router.push as jest.Mock).toHaveBeenCalledWith("/modules/act/choice-point");
  });

  it("renders the quiet shell header with no book credit (#493, #494, #733)", () => {
    renderWithProviders(<ActHomeScreen />);

    expect(screen.queryByText(/Inspired by/)).toBeNull();
  });

  it("renders recent defusion logs empty state when no logs exist", () => {
    renderWithProviders(<ActHomeScreen />);

    expect(screen.getByText(/No defusion logs yet/)).toBeTruthy();
  });

  /**
   * The recent rows and the full log list render through one shared row
   * (#1388): an inert card here beside a tappable row there would change the
   * shape of what a user is reading the moment they tap through.
   */
  describe("recent defusion logs as shared rows (#1388)", () => {
    beforeEach(() => {
      mockUseDefusionLogs.mockReturnValue({
        data: [
          {
            id: "log-1",
            userId: "user-1",
            fusedThought: "I'm going to fail",
            thoughtCategory: "selfJudgment",
            fusionLevelBefore: 60,
            techniqueUsed: "musicalThoughts",
            defusedVersion: "",
            fusionLevelAfter: 20,
            notes: "",
            createdAt: "2026-05-24T09:00:00.000Z",
            updatedAt: "2026-05-24T09:00:00.000Z",
          },
        ],
      } as unknown as ReturnType<typeof useDefusionLogs>);
    });

    it("links each recent row to its own log's detail route", () => {
      renderWithProviders(<ActHomeScreen />);

      fireEvent.press(screen.getByText("I'm going to fail"));

      expect(router.push as jest.Mock).toHaveBeenCalledWith({
        pathname: "/modules/act/defusion/[id]",
        params: { id: "log-1" },
      });
    });

    it("names the technique on the row, not the category", () => {
      renderWithProviders(<ActHomeScreen />);

      expect(screen.getByText("Musical thoughts")).toBeTruthy();
      expect(screen.queryByText("Self-judgment")).toBeNull();
    });

    it("shows the door as a 'Show all logs' link to the full list", () => {
      renderWithProviders(<ActHomeScreen />);

      fireEvent.press(screen.getByRole("link", { name: "Show all logs" }));

      expect(router.push as jest.Mock).toHaveBeenCalledWith("/modules/act/defusion");
    });
  });

  describe("the header's three lifetime stats (#1378)", () => {
    /**
     * Zero is an honest value for a head count, so the run is always three items. A
     * brand-new account seeing an empty header would be the screen telling them nothing
     * about a module they have just opened.
     */
    it("renders all three at zero for a brand-new account", () => {
      renderWithProviders(<ActHomeScreen />);

      expect(screen.getByText("0 choice points mapped")).toBeTruthy();
      expect(screen.getByText("0 thoughts unhooked")).toBeTruthy();
      expect(screen.getByText("0 committed actions")).toBeTruthy();
    });

    it("pluralises each label against its own count", () => {
      setCounts({ choicePoints: 1, defusionLogs: 1, committedActions: 1 });

      renderWithProviders(<ActHomeScreen />);

      expect(screen.getByText("1 choice point mapped")).toBeTruthy();
      expect(screen.getByText("1 thought unhooked")).toBeTruthy();
      expect(screen.getByText("1 committed action")).toBeTruthy();
    });

    /**
     * ☠️ The whole reason these are head counts. A client-side `.length` would read 30
     * for choice points (the list hook's limit is outside its query key, so home shares
     * the list screen's cache entry) and 50 for defusion (home asks for 50 rows). Both
     * numbers are wrong in the direction that makes a user's history look smaller than
     * it is.
     */
    it("reads past the list caps that a length count would truncate at", () => {
      setCounts({ choicePoints: 84, defusionLogs: 60, committedActions: 12 });
      mockUseDefusionLogs.mockReturnValue({
        data: [],
      } as unknown as ReturnType<typeof useDefusionLogs>);

      renderWithProviders(<ActHomeScreen />);

      expect(screen.getByText("84 choice points mapped")).toBeTruthy();
      expect(screen.getByText("60 thoughts unhooked")).toBeTruthy();
      expect(screen.queryByText("30 choice points mapped")).toBeNull();
      expect(screen.queryByText("50 thoughts unhooked")).toBeNull();
    });

    /**
     * The committed-action stat counts every action ever made, so completing your only
     * one leaves it at 1. An active-only count would fall 1 → 0, and a counter that goes
     * down when you succeed reads as punishment for finishing.
     */
    it("asks for committed actions at every status, not just the active ones", () => {
      renderWithProviders(<ActHomeScreen />);

      expect(mockUseCommittedActionCount).toHaveBeenCalledWith("user-1");
    });

    /**
     * ☠️ An unresolved count is not zero. Falling back to 0 in the value would tell a
     * user with 200 choice points they had none for as long as the query was in flight -
     * the same history-looks-smaller lie the head counts exist to prevent.
     */
    it("shows a dash, not a zero, while a count is still loading", () => {
      setCounts({});

      renderWithProviders(<ActHomeScreen />);

      expect(screen.getByText("— choice points mapped")).toBeTruthy();
      expect(screen.queryByText("0 choice points mapped")).toBeNull();
    });
  });

  /**
   * The recent-logs heading was a plain 14px text node with no role at all, so a screen
   * reader could not navigate this page by its sections (#1378).
   */
  it("gives the recent-logs section a real level-3 heading", () => {
    renderWithProviders(<ActHomeScreen />);

    const heading = screen.getByRole("heading", { name: "Recent defusion logs" });

    // `Number`, because `Text`'s heading variants set `aria-level` as a string while
    // `Section` sets it as a number. The outline level is what matters here.
    expect(Number(heading.props["aria-level"])).toBe(3);
  });

  it("keeps the framework block's own heading above it in the outline", () => {
    renderWithProviders(<ActHomeScreen />);

    const framework = screen.getByRole("heading", { name: "The framework" });

    expect(Number(framework.props["aria-level"])).toBe(2);
  });

  it("collapses the graduation hero when graduationDismissedAt is set", () => {
    mockUseActProgram.mockReturnValue({
      program: { ...defaultActProgram, status: "graduated" },
      isLoading: false,
      isUpdating: false,
      abandonProgram: jest.fn(),
      advancePhase: jest.fn(),
      dismissProgramPrompt: jest.fn(),
      dismissGraduation: jest.fn(),
      promptDismissedAt: null,
      graduationDismissedAt: "2026-05-20T00:00:00.000Z",
      startProgram: jest.fn(),
      showProgramPrompt: jest.fn(),
      replayProgram: jest.fn(),
    } as unknown as ReturnType<typeof useActProgram>);

    renderWithProviders(<ActHomeScreen />);

    // Collapsed: the full graduation hero title is hidden; the replay row shows.
    expect(screen.queryByText("You finished the ACT program")).toBeNull();
    expect(screen.getByText("Replay the ACT program")).toBeTruthy();
  });
});
