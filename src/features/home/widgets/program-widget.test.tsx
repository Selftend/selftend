import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { ProgramWidget } from "@/src/features/home/widgets/program-widget";
import { useUserPreferences } from "@/src/features/settings/queries";
import { useProgramWidgetTaskStatus } from "@/src/features/home/program-widget-status";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { CBT_PROGRAM } from "@/src/features/cbt/program-definition";
import { WIDGET_META } from "@/src/features/home/widget-registry";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * Rewritten for #977. The previous suite pinned a task list, two CTA buttons and a
 * completion sentence - all of which the ticket removes by decision, not by accident, so
 * those cases describe a card that no longer exists rather than coverage that lapsed.
 * What replaces them is stricter: the badge's gating, and the absence of the fraction and
 * the progress bar in every state.
 */

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/home/program-widget-status", () => ({
  useProgramWidgetTaskStatus: jest.fn(() => ({ data: [] })),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockTaskStatus = useProgramWidgetTaskStatus as jest.MockedFunction<
  typeof useProgramWidgetTaskStatus
>;
const mockRouter = jest.mocked(router);

const prefs = (overrides: Record<string, unknown> = {}) =>
  mockUseUserPreferences.mockReturnValue({
    data: { ...defaultUserPreferences, ...overrides },
  } as ReturnType<typeof useUserPreferences>);

const badge = () => screen.queryByTestId("programme-badge-cbt")?.props.children ?? null;
const secondLine = () => screen.getByTestId("programme-line-cbt").props.children as string;

beforeEach(() => {
  jest.clearAllMocks();
  mockTaskStatus.mockReturnValue({ data: [] } as unknown as ReturnType<
    typeof useProgramWidgetTaskStatus
  >);
});

describe("ProgramWidget badge", () => {
  it("names the current phase as an ordinal while the programme is running", () => {
    prefs({ cbtProgramStartedAt: "2026-07-01T00:00:00.000Z", cbtProgramPhaseIndex: 2 });

    renderWithProviders(<ProgramWidget module="cbt" userId="user-1" />);

    expect(badge()).toBe(`Phase 3 of ${CBT_PROGRAM.length}`);
  });

  it("shows no badge before the programme is started", () => {
    prefs();

    renderWithProviders(<ProgramWidget module="cbt" userId="user-1" />);

    expect(badge()).toBeNull();
  });

  it("shows Complete once the programme is finished", () => {
    prefs({
      cbtProgramStartedAt: "2026-07-01T00:00:00.000Z",
      cbtProgramCompletedAt: "2026-08-01T00:00:00.000Z",
      cbtProgramPhaseIndex: 4,
    });

    renderWithProviders(<ProgramWidget module="cbt" userId="user-1" />);

    expect(badge()).toBe("Complete");
  });

  it("shows NO badge for an abandoned programme whose phase index is stale", () => {
    // `abandonProgram` nulls `started_at` and leaves `phase_index` where it was. Gating
    // on the phase index alone would meet someone who quit in phase four with a cheerful
    // "Phase 5 of 5" - the single most important case in this file.
    prefs({ cbtProgramStartedAt: null, cbtProgramCompletedAt: null, cbtProgramPhaseIndex: 4 });

    renderWithProviders(<ProgramWidget module="cbt" userId="user-1" />);

    expect(badge()).toBeNull();
  });
});

describe("ProgramWidget second line", () => {
  it("names the current phase theme while running", () => {
    prefs({ cbtProgramStartedAt: "2026-07-01T00:00:00.000Z", cbtProgramPhaseIndex: 0 });

    renderWithProviders(<ProgramWidget module="cbt" userId="user-1" />);

    expect(secondLine().length).toBeGreaterThan(0);
    // The module description is the OTHER states' line; running must not fall back to it.
    expect(secondLine()).not.toMatch(/guided path through/i);
  });

  it("describes the module in both non-running states, identically", () => {
    // Never-started and abandoned collapse into one rendering. That is what makes
    // re-pitching a dismissed programme impossible by construction: the card never reads
    // `*_prompt_dismissed_at`, so there is no flag to get wrong.
    prefs();
    renderWithProviders(<ProgramWidget module="cbt" userId="user-1" />);
    const neverStarted = secondLine();

    prefs({ cbtProgramStartedAt: null, cbtProgramPhaseIndex: 3 });
    renderWithProviders(<ProgramWidget module="cbt" userId="user-1" />);

    expect(secondLine()).toBe(neverStarted);
    expect(neverStarted).toMatch(/guided path through/i);
  });
});

describe("ProgramWidget shape", () => {
  it("takes its destination from the catalogue rather than restating it", () => {
    prefs();

    renderWithProviders(<ProgramWidget module="act" userId="user-1" />);
    fireEvent.press(screen.getByTestId("programme-card-act"));

    expect(mockRouter.push).toHaveBeenCalledWith(WIDGET_META["act-programme"].route);
  });

  it("presses whole to the module, with one accessible name", () => {
    prefs({ cbtProgramStartedAt: "2026-07-01T00:00:00.000Z", cbtProgramPhaseIndex: 1 });

    renderWithProviders(<ProgramWidget module="cbt" userId="user-1" />);
    fireEvent.press(screen.getByTestId("programme-card-cbt"));

    expect(mockRouter.push).toHaveBeenCalledWith("/modules/cbt");
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText(`CBT programme, Phase 2 of ${CBT_PROGRAM.length}, ${secondLine()}`),
    ).toBeTruthy();
  });

  it("renders no CTA button, in any state", () => {
    // A button inside a pressable card is two targets for one destination.
    for (const state of [
      {},
      { cbtProgramStartedAt: "2026-07-01T00:00:00.000Z" },
      {
        cbtProgramStartedAt: "2026-07-01T00:00:00.000Z",
        cbtProgramCompletedAt: "2026-08-01T00:00:00.000Z",
      },
    ]) {
      prefs(state);
      const { unmount } = renderWithProviders(<ProgramWidget module="cbt" userId="user-1" />);
      // The card itself is the only button.
      expect(screen.getAllByRole("button")).toHaveLength(1);
      unmount();
    }
  });

  it("renders no fraction and no progress bar, in any state", () => {
    // "4 of 12" does not ship in any form: no per-task completion is persisted, and a
    // task-derived numerator would fall overnight when the daily practices reset.
    for (const state of [
      {},
      { cbtProgramStartedAt: "2026-07-01T00:00:00.000Z", cbtProgramPhaseIndex: 1 },
      {
        cbtProgramStartedAt: "2026-07-01T00:00:00.000Z",
        cbtProgramCompletedAt: "2026-08-01T00:00:00.000Z",
      },
    ]) {
      prefs(state);
      const { unmount } = renderWithProviders(<ProgramWidget module="cbt" userId="user-1" />);

      // `Phase 2 of 5` is an ordinal, not a fraction - so bare "N of M" is only allowed
      // when the phase word introduces it.
      const fractions = screen.queryAllByText(/\b\d+\s+of\s+\d+\b/);
      for (const node of fractions) {
        expect(node.props.children).toMatch(/^Phase /);
      }
      // Not `queryByTestId("progress-bar")` - `ProgressBar` sets no testID, so that
      // assertion was null before this change and after it, and could never fail. The
      // track is what a bar would put on this card, and `bg-muted` on a `primary/5`
      // wash is the 1.052:1 pairing the ticket measured and rejected.
      for (const node of screen.UNSAFE_root.findAll(
        (element) => typeof element.props?.className === "string",
      )) {
        expect(node.props.className).not.toContain("bg-muted");
      }
      unmount();
    }
  });

  it("never asks the task-status RPC for data", () => {
    // Home's whole programme tier is `useUserPreferences` only. The RPC survives for
    // `use-widget-snapshot-sync`, which still renders the task list on the Android
    // launcher widget - so this asserts the call is not made, not that it is gone.
    prefs({ cbtProgramStartedAt: "2026-07-01T00:00:00.000Z", cbtProgramPhaseIndex: 1 });

    renderWithProviders(<ProgramWidget module="cbt" userId="user-1" />);

    expect(mockTaskStatus).not.toHaveBeenCalled();
  });
});
