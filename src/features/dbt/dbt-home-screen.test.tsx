import { fireEvent, screen } from "@testing-library/react-native";

import DbtHomeScreen from "./dbt-home-screen";
import {
  useDbtSessionCount,
  useEmotionRecordCount,
  useJudgementCount,
  useOppositeActionPlanCount,
  usePrefetchCopingPlan,
  useScriptCount,
  useWiseMindCheckinCount,
} from "@/src/features/dbt/queries";
import { useDbtProgram } from "@/src/features/dbt/use-dbt-program";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { canGoBack: jest.fn(() => false), push: jest.fn() },
  usePathname: () => "/modules/dbt",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/dbt/use-dbt-program", () => ({
  useDbtProgram: jest.fn(),
}));

jest.mock("@/src/features/dbt/queries", () => ({
  useDbtSessionCount: jest.fn(),
  useEmotionRecordCount: jest.fn(),
  useJudgementCount: jest.fn(),
  useOppositeActionPlanCount: jest.fn(),
  usePrefetchCopingPlan: jest.fn(),
  useScriptCount: jest.fn(),
  useWiseMindCheckinCount: jest.fn(),
}));

const countHooks = [
  useWiseMindCheckinCount,
  useJudgementCount,
  useEmotionRecordCount,
  useOppositeActionPlanCount,
  useScriptCount,
] as unknown as jest.Mock[];

/** The five record counts and the session count, as the header reads them. */
function setCounts(records: (number | undefined)[], sessions: number | undefined) {
  countHooks.forEach((hook, index) => hook.mockReturnValue({ data: records[index] }));
  (useDbtSessionCount as unknown as jest.Mock).mockReturnValue({ data: sessions });
}

const prefetch = jest.fn();

const NOT_STARTED = {
  status: "not_started" as const,
  startedAt: null,
  phaseIndex: 0,
  totalPhases: 4,
  isLastPhase: false,
  phase: null,
  phaseReady: false,
  summaryStats: { sessions: 0, wiseMindCheckins: 0, emotionRecords: 0, scriptsDone: 0 },
};

/** The programme hook, with everything the home reads off it. */
function setProgram(
  program: Record<string, unknown> = NOT_STARTED,
  overrides: Record<string, unknown> = {},
) {
  (useDbtProgram as unknown as jest.Mock).mockReturnValue({
    program,
    isLoading: false,
    startProgram: jest.fn(),
    dismissProgramPrompt: jest.fn(),
    showProgramPrompt: jest.fn(),
    abandonProgram: jest.fn(),
    replayProgram: jest.fn(),
    advancePhase: jest.fn(),
    dismissGraduation: jest.fn(),
    promptDismissedAt: null,
    graduationDismissedAt: null,
    isUpdating: false,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  useNavigationOriginStore.setState({ pending: null });
  (usePrefetchCopingPlan as unknown as jest.Mock).mockReturnValue(prefetch);
  setCounts([1, 1, 1, 1, 1], 1);
  setProgram();
});

/** Every rendered string, in document order. */
function renderedTextInOrder(): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === "string") {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object" && "children" in node) {
      walk((node as { children: unknown }).children);
    }
  };
  walk(screen.toJSON());
  return out;
}

/**
 * This screen replaced the DBT *overview* (#1020, from Apple's Guideline 2.1
 * *App Completeness* citation on build 6), and the two assertions that citation
 * earned are carried forward here rather than deleted with the screen they were
 * written against: the four skill groups are still all explained, and nothing
 * promises a module that does not exist. The screen changed underneath them; the
 * promises it must not make did not.
 */
describe("DbtHomeScreen", () => {
  it("promises no module that does not exist", () => {
    renderWithProviders(<DbtHomeScreen />);

    expect(renderedTextInOrder().join(" ")).not.toMatch(/roadmap|coming soon|\bsoon\b/i);
  });

  it("still explains all four skill groups", () => {
    renderWithProviders(<DbtHomeScreen />);

    expect(screen.getByText("The four skill groups")).toBeTruthy();
    for (const name of [
      "Distress tolerance",
      "Mindfulness",
      "Emotion regulation",
      "Interpersonal effectiveness",
    ]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });

  /**
   * ☠️ S4: *crisis* keeps one meaning in this app - the crisis page's. The
   * overview's distress-tolerance line said "Getting through a crisis without
   * making it worse", and the reword is the whole reason that string moved. A
   * negative assertion on the module's own copy is the only thing that keeps it
   * reworded, since the surrounding callout is allowed to say it.
   */
  it("does not call an ordinary hard moment a crisis", () => {
    renderWithProviders(<DbtHomeScreen />);

    expect(screen.getByText("Getting through a hard moment without making it worse.")).toBeTruthy();
    expect(screen.queryByText(/getting through a crisis/i)).toBeNull();
  });

  it("leads with the module's own sentence, a use context and never a kind of person", () => {
    renderWithProviders(<DbtHomeScreen />);

    expect(screen.getByText(/Skills for when feelings run high/)).toBeTruthy();
    expect(screen.getByText("Dialectical behaviour therapy")).toBeTruthy();
  });

  it("counts lifetime records across all five kinds, and sessions beside them", () => {
    setCounts([2, 3, 4, 5, 6], 7);
    renderWithProviders(<DbtHomeScreen />);

    // The value and its noun are ONE inline sentence in the header's stat run
    // (#749 pattern B), so the row reads as written rather than as two nodes.
    expect(screen.getByText("20 records")).toBeTruthy();
    expect(screen.getByText("7 sessions")).toBeTruthy();
  });

  /**
   * ☠️ An unresolved count is not zero. One in flight leaves the SUM unknown,
   * so the dash has to cover all five - summing the four that resolved would
   * tell someone with 200 records they had 40, which is the
   * history-looks-smaller lie the dash exists to prevent.
   */
  it("shows an em dash while any one count is still in flight, never a partial sum", () => {
    setCounts([2, 3, undefined, 5, 6], 7);
    renderWithProviders(<DbtHomeScreen />);

    expect(screen.getByText("— records")).toBeTruthy();
    expect(screen.queryByText(/16 records/)).toBeNull();
    // The session count resolved, so only the sum is unknown.
    expect(screen.getByText("7 sessions")).toBeTruthy();
  });

  it("renders zero honestly once every count has resolved", () => {
    setCounts([0, 0, 0, 0, 0], 0);
    renderWithProviders(<DbtHomeScreen />);

    expect(screen.getByText("0 records")).toBeTruthy();
    expect(screen.getByText("0 sessions")).toBeTruthy();
  });

  it("sends the info action to the learn primer, recording where it came from", () => {
    renderWithProviders(<DbtHomeScreen />);

    fireEvent.press(screen.getByLabelText("What DBT is"));

    // ⚠️ The assertion is on the STORE. `usePushWithOrigin` pushes THROUGH
    // `router.push`, so an assertion on the router would pass identically
    // whether or not this screen ever went through the helper.
    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/modules/dbt",
      forPathname: "/modules/dbt/learn",
    });
  });

  it("opens a group's learn page from its card", () => {
    renderWithProviders(<DbtHomeScreen />);

    fireEvent.press(screen.getAllByText("Learn")[0]);

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/modules/dbt",
      forPathname: "/modules/dbt/learn/distress-tolerance",
    });
  });

  it("invites the person into the programme, and offers the bell", () => {
    renderWithProviders(<DbtHomeScreen />);

    expect(screen.getByText("Start the DBT programme")).toBeTruthy();
    expect(screen.getByLabelText("Reminders")).toBeTruthy();
  });

  /**
   * ☠️ The flag restores an invitation the person closed. A flag beside a
   * RUNNING programme would be noise, so it only appears while nothing is
   * started.
   */
  it("shows the restore-invitation flag only while nothing is started", () => {
    renderWithProviders(<DbtHomeScreen />);
    expect(screen.getByLabelText("Show the programme invitation")).toBeTruthy();

    setProgram({ ...NOT_STARTED, status: "in_progress", startedAt: "2026-06-01T09:00:00.000Z" });
    renderWithProviders(<DbtHomeScreen />);
    expect(screen.queryByLabelText("Show the programme invitation")).toBeNull();
  });

  it("shows nothing at all once the invitation is dismissed and nothing started", () => {
    setProgram(NOT_STARTED, { promptDismissedAt: "2026-06-01T09:00:00.000Z" });
    renderWithProviders(<DbtHomeScreen />);

    expect(screen.queryByText("Start the DBT programme")).toBeNull();
  });

  /**
   * ☠️ CBT's filtered graduation, never ACT's: only non-zero lines, so a
   * graduation never reads a row of noughts back at someone.
   */
  it("filters the graduation to what actually happened", () => {
    setProgram({
      ...NOT_STARTED,
      status: "graduated",
      startedAt: "2026-06-01T09:00:00.000Z",
      summaryStats: { sessions: 2, wiseMindCheckins: 0, emotionRecords: 1, scriptsDone: 0 },
    });
    renderWithProviders(<DbtHomeScreen />);

    expect(screen.getByText("You finished the DBT programme")).toBeTruthy();
    expect(screen.getByText("2 sessions completed")).toBeTruthy();
    expect(screen.getByText("1 emotion record")).toBeTruthy();
    expect(screen.queryByText(/0 wise mind|0 scripts/)).toBeNull();
  });

  it("says something kind rather than nothing when every count is zero", () => {
    setProgram({
      ...NOT_STARTED,
      status: "graduated",
      startedAt: "2026-06-01T09:00:00.000Z",
    });
    renderWithProviders(<DbtHomeScreen />);

    expect(screen.getByText(/You reached the end at your own pace/)).toBeTruthy();
  });

  it("keeps the crisis callout on the module home", () => {
    renderWithProviders(<DbtHomeScreen />);

    expect(screen.getByText("Use urgent support for urgent risk")).toBeTruthy();
  });
});
