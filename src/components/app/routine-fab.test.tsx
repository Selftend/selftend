import { act, fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { RoutineFab } from "@/src/components/app/routine-fab";
import { useRoutines } from "@/src/features/routines/queries";
import type { RoutineWithSteps } from "@/src/features/routines/types";
import { useRoutineToolRecords } from "@/src/features/routines/use-routine-tool-records";
import {
  INSET_LAYER,
  type InsetLayer,
  useLayeredInsetStore,
} from "@/src/stores/layered-inset-store";
import { currentDateKey } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: jest.fn(() => "/"),
}));

const mockUsePathname = jest.requireMock("expo-router").usePathname as jest.MockedFunction<
  () => string
>;

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/routines/queries", () => ({
  useRoutines: jest.fn(),
  useUpdateRoutine: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

jest.mock("@/src/features/routines/use-routine-tool-records", () => ({
  useRoutineToolRecords: jest.fn(),
}));

jest.mock("@/src/lib/notifications", () => ({
  getReminderTimeZone: () => "Europe/Sofia",
}));

// The async AccessibilityInfo probe resolves after the test ends, tripping the
// act() guard - pin it like the other sheet tests do.
jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: () => false,
}));

const mockUseRoutines = useRoutines as jest.MockedFunction<typeof useRoutines>;
const mockUseRoutineToolRecords = useRoutineToolRecords as jest.MockedFunction<
  typeof useRoutineToolRecords
>;

function makeRoutine(
  id: string,
  name: string,
  toolIds: readonly ("mood" | "journal" | "gratitude")[],
  schedule: Partial<Pick<RoutineWithSteps, "cadence" | "customDays">> = {},
): RoutineWithSteps {
  return {
    id,
    userId: "user-1",
    name,
    reminderEnabled: false,
    reminderHour: null,
    reminderMinute: null,
    reminderTimezone: null,
    cadence: schedule.cadence ?? "daily",
    customDays: schedule.customDays ?? [],
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T08:00:00.000Z",
    steps: toolIds.map((toolId, index) => ({
      id: `${id}-step-${index}`,
      routineId: id,
      userId: "user-1",
      toolId,
      position: index,
      createdAt: "2026-07-01T08:00:00.000Z",
      updatedAt: "2026-07-01T08:00:00.000Z",
    })),
  };
}

function setRoutines(routines: RoutineWithSteps[], isLoading = false) {
  mockUseRoutines.mockReturnValue({ data: routines, isLoading } as unknown as ReturnType<
    typeof useRoutines
  >);
}

describe("RoutineFab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue("/");
    mockUseRoutineToolRecords.mockReturnValue({});
    useLayeredInsetStore.setState({ edges: {} });
  });

  it("renders nothing at zero routines", () => {
    setRoutines([]);

    renderWithProviders(<RoutineFab />);

    expect(screen.queryByTestId("routine-fab")).toBeNull();
  });

  // The completed check plays only on a LIVE transition to zero open steps -
  // a fresh render with everything already done must show nothing at all.
  it("renders nothing while all steps are complete today", () => {
    setRoutines([makeRoutine("r-1", "Morning reset", ["mood"])]);
    mockUseRoutineToolRecords.mockReturnValue({
      moodLogs: [{ dayKey: currentDateKey() }],
    });

    renderWithProviders(<RoutineFab />);

    expect(screen.queryByTestId("routine-fab")).toBeNull();
    expect(screen.queryByTestId("routine-fab-complete")).toBeNull();
  });

  // #91: the count is the FIRST OPEN routine's, not the cross-routine
  // aggregate. Mood is done in both routines, so the aggregate would be 2/4 -
  // the button must show the first routine's 1/3.
  it("counts the first open routine, not the aggregate", () => {
    setRoutines([
      makeRoutine("r-1", "Morning reset", ["mood", "journal", "gratitude"]),
      makeRoutine("r-2", "Evening wind-down", ["mood"]),
    ]);
    mockUseRoutineToolRecords.mockReturnValue({
      moodLogs: [{ dayKey: currentDateKey() }],
    });

    renderWithProviders(<RoutineFab />);

    expect(screen.getByTestId("routine-fab")).toBeTruthy();
    expect(screen.getByText("1/3")).toBeTruthy();
    expect(screen.queryByText("2/4")).toBeNull();
    expect(screen.getByLabelText('Continue "Morning reset": 1 of 3 steps done today')).toBeTruthy();
  });

  // #91: the counted routine is exactly the one the sheet opens pinned -
  // with the first routine complete, both must skip to the second.
  it("counts the same routine the sheet opens pinned", () => {
    setRoutines([
      makeRoutine("r-1", "Morning reset", ["mood"]),
      makeRoutine("r-2", "Evening wind-down", ["journal", "gratitude"]),
    ]);
    mockUseRoutineToolRecords.mockReturnValue({
      moodLogs: [{ dayKey: currentDateKey() }],
    });

    renderWithProviders(<RoutineFab />);

    expect(screen.getByText("0/2")).toBeTruthy();
    expect(
      screen.getByLabelText('Continue "Evening wind-down": 0 of 2 steps done today'),
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId("routine-fab"));

    // The sheet pins the same first-open routine the button counted.
    expect(screen.getByText("Evening wind-down")).toBeTruthy();
    expect(screen.queryByText("Morning reset")).toBeNull();
  });

  // #121: the queue is visible at a glance - other scheduled routines with
  // open steps surface as a "+N" suffix after the counted routine's steps.
  it("shows how many routines queue behind the counted one", () => {
    setRoutines([
      makeRoutine("r-1", "Morning reset", ["mood"]),
      makeRoutine("r-2", "Evening wind-down", ["journal"]),
    ]);

    renderWithProviders(<RoutineFab />);

    expect(screen.getByText("0/1 ·+1")).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Continue "Morning reset": 0 of 1 steps done today, 1 more routine after this',
      ),
    ).toBeTruthy();
  });

  it("pluralizes the queue suffix and drops it when nothing follows", () => {
    setRoutines([
      makeRoutine("r-1", "Morning reset", ["mood"]),
      makeRoutine("r-2", "Evening wind-down", ["journal"]),
      makeRoutine("r-3", "Midday pause", ["gratitude"]),
    ]);

    renderWithProviders(<RoutineFab />);

    expect(screen.getByText("0/1 ·+2")).toBeTruthy();
    expect(screen.getByLabelText(/2 more routines after this/)).toBeTruthy();

    // The last routine standing carries no suffix.
    mockUseRoutineToolRecords.mockReturnValue({
      moodLogs: [{ dayKey: currentDateKey() }],
      gratitudeEntries: [{ dayKey: currentDateKey() }],
    });
    screen.rerender(<RoutineFab />);
    expect(screen.getByText("0/1")).toBeTruthy();
    expect(screen.queryByText(/·\+/)).toBeNull();
  });

  // #121: the count follows what the user is actually DOING - an in-progress
  // routine outranks an earlier not-started one.
  it("follows the in-progress routine instead of the first open", () => {
    setRoutines([
      makeRoutine("r-1", "Morning reset", ["journal"]),
      makeRoutine("r-2", "Evening wind-down", ["mood", "gratitude"]),
    ]);
    mockUseRoutineToolRecords.mockReturnValue({
      moodLogs: [{ dayKey: currentDateKey() }],
    });

    renderWithProviders(<RoutineFab />);

    // r-2 is 1/2 in progress; r-1 (first by order) is merely not started.
    expect(screen.getByText("1/2 ·+1")).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Continue "Evening wind-down": 1 of 2 steps done today, 1 more routine after this',
      ),
    ).toBeTruthy();
    expect(screen.queryByText("0/1 ·+1")).toBeNull();
  });

  // #104: scheduling composes at the view layer - the FAB surfaces ONLY
  // routines scheduled today. Open steps on unscheduled routines are
  // invisible to it.
  describe("scheduled-today filtering (#104)", () => {
    const todayDow = new Date().getDay();
    const otherDow = (todayDow + 1) % 7;

    it("renders nothing when the only open routine is on-demand", () => {
      setRoutines([makeRoutine("r-1", "Reset kit", ["mood"], { cadence: "on-demand" })]);

      renderWithProviders(<RoutineFab />);

      expect(screen.queryByTestId("routine-fab")).toBeNull();
      expect(screen.queryByTestId("routine-fab-complete")).toBeNull();
    });

    it("hides a custom-days routine on a day it is not scheduled", () => {
      setRoutines([
        makeRoutine("r-1", "Off-day routine", ["mood"], {
          cadence: "custom",
          customDays: [otherDow],
        }),
      ]);

      renderWithProviders(<RoutineFab />);

      expect(screen.queryByTestId("routine-fab")).toBeNull();
    });

    it("still counts a custom-days routine scheduled for today", () => {
      setRoutines([
        makeRoutine("r-1", "On-day routine", ["mood"], {
          cadence: "custom",
          customDays: [todayDow],
        }),
      ]);

      renderWithProviders(<RoutineFab />);

      expect(screen.getByTestId("routine-fab")).toBeTruthy();
      expect(screen.getByText("0/1")).toBeTruthy();
    });

    it("counts only scheduled routines and keeps unscheduled ones out of the sheet", () => {
      // r-1 (on-demand) has an open step but must be invisible: the count is
      // r-2's alone, and the sheet must not offer r-1 as a chip.
      setRoutines([
        makeRoutine("r-1", "Reset kit", ["journal"], { cadence: "on-demand" }),
        makeRoutine("r-2", "Morning reset", ["mood", "gratitude"]),
      ]);

      renderWithProviders(<RoutineFab />);

      expect(screen.getByText("0/2")).toBeTruthy();
      expect(
        screen.getByLabelText('Continue "Morning reset": 0 of 2 steps done today'),
      ).toBeTruthy();

      fireEvent.press(screen.getByTestId("routine-fab"));

      expect(screen.getByText("Morning reset")).toBeTruthy();
      expect(screen.queryByText("Reset kit")).toBeNull();
    });
  });

  // #102: on-demand routines never nudge - and this is the seam where that is
  // really enforced (#1542). The continue sheet carries a defensive
  // `cadence === "on-demand"` guard on its reminder offer, but the sheet is
  // mounted in exactly one place and fed `scheduledViews`, so the guard is
  // unreachable: the offer can never be put in front of an on-demand routine
  // because the sheet never opens on one. These pin the composition end to
  // end - if a future change widened the sheet's input, the guard alone would
  // hold the rule, and these would be the tests that noticed the widening.
  describe("the reminder offer never reaches an on-demand routine (#102)", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("plays no completion check when an on-demand routine finishes its last step", () => {
      // Mid-flight (journal done, mood open) and now finishing - the shape the
      // completion check exists for. It was never counted, so this is not a
      // transition to zero open steps: nothing arms, and with no check there is
      // no way to open the sheet on it. (The never-counted half is already
      // pinned above; what is new here is that FINISHING one stays silent.)
      setRoutines([makeRoutine("r-1", "Reset kit", ["journal", "mood"], { cadence: "on-demand" })]);
      mockUseRoutineToolRecords.mockReturnValue({
        journalEntries: [{ dayKey: currentDateKey() }],
      });

      renderWithProviders(<RoutineFab />);
      expect(screen.queryByTestId("routine-fab")).toBeNull();

      mockUseRoutineToolRecords.mockReturnValue({
        journalEntries: [{ dayKey: currentDateKey() }],
        moodLogs: [{ dayKey: currentDateKey() }],
      });
      screen.rerender(<RoutineFab />);

      expect(screen.queryByTestId("routine-fab")).toBeNull();
      expect(screen.queryByTestId("routine-fab-complete")).toBeNull();
    });

    it("pins the offer to the scheduled routine even when an on-demand one is mid-flight", () => {
      // r-2 is on-demand and IN PROGRESS (journal done, gratitude open), which
      // is exactly what firstOpenRoutineView prefers (#121) - so if the
      // schedule filter ever stopped excluding on-demand, r-2 would become the
      // counted routine, then the latched `completedRoutineId`, and the sheet
      // would open on ITS completion. r-1 is the only scheduled routine, so it
      // must be the one counted, pinned, and offered a reminder.
      setRoutines([
        makeRoutine("r-1", "Morning reset", ["mood"]),
        makeRoutine("r-2", "Reset kit", ["journal", "gratitude"], { cadence: "on-demand" }),
      ]);
      mockUseRoutineToolRecords.mockReturnValue({
        journalEntries: [{ dayKey: currentDateKey() }],
      });

      renderWithProviders(<RoutineFab />);
      // r-1's own count, not r-2's in-progress "1/2 ·+1".
      expect(screen.getByText("0/1")).toBeTruthy();
      expect(
        screen.getByLabelText('Continue "Morning reset": 0 of 1 steps done today'),
      ).toBeTruthy();

      mockUseRoutineToolRecords.mockReturnValue({
        journalEntries: [{ dayKey: currentDateKey() }],
        moodLogs: [{ dayKey: currentDateKey() }],
      });
      screen.rerender(<RoutineFab />);

      fireEvent.press(screen.getByTestId("routine-fab-complete"));

      // The offer is live, and it belongs to the scheduled routine...
      expect(screen.getByText("Morning reset")).toBeTruthy();
      expect(screen.getByText("Set a daily reminder")).toBeTruthy();
      // ...while the on-demand routine never entered the sheet at all, so its
      // completion state - and the defensive cadence guard - is never reached.
      expect(screen.queryByText("Reset kit")).toBeNull();
    });
  });

  // #90: the FAB never renders over data-entry screens - it covered
  // MobileFormScreen's sticky Save footer (e.g. the mood editor on mobile).
  describe("data-entry route suppression (#90)", () => {
    beforeEach(() => {
      setRoutines([makeRoutine("r-1", "Morning reset", ["mood"])]);
    });

    it.each([
      ["/tools/check-in/new", "a creation form"],
      ["/routines/routine-1/edit", "an edit form"],
      ["/tools/habits/habit-1/log", "a log form"],
      ["/modules/cbt/self-care", "a fixed-path form"],
      ["/modules/cbt/values", "the CBT values editor"],
      ["/modules/act/values/health", "a dynamic-segment form"],
    ])("stays hidden on %s (%s)", (pathname) => {
      mockUsePathname.mockReturnValue(pathname);

      renderWithProviders(<RoutineFab />);

      expect(screen.queryByTestId("routine-fab")).toBeNull();
    });

    it.each([
      ["/", "home"],
      ["/routines", "the routines list"],
      ["/routines/routine-1", "a routine detail"],
      ["/tools/gratitude-log", "a tool index whose name merely ends in -log"],
      ["/modules/act/values", "the values index"],
    ])("stays visible on %s (%s)", (pathname) => {
      mockUsePathname.mockReturnValue(pathname);

      renderWithProviders(<RoutineFab />);

      expect(screen.getByTestId("routine-fab")).toBeTruthy();
    });
  });

  it("opens the continue-your-routine sheet on press", () => {
    setRoutines([makeRoutine("r-1", "Morning reset", ["mood"])]);

    renderWithProviders(<RoutineFab />);

    expect(screen.queryByText("Continue your routine")).toBeNull();
    fireEvent.press(screen.getByTestId("routine-fab"));
    expect(screen.getByText("Continue your routine")).toBeTruthy();
    expect(screen.getByText("Do next step")).toBeTruthy();
  });

  // #91: completing the last open step must not yank the button away - it
  // morphs to a checkmark, holds ~2.5s, fades ~400ms, and stays gone until
  // steps open again.
  describe("completed state (#91)", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    function completeTheOnlyStep() {
      mockUseRoutineToolRecords.mockReturnValue({
        moodLogs: [{ dayKey: currentDateKey() }],
      });
    }

    it("morphs to a check on completion, holds, then fades away for good", () => {
      setRoutines([makeRoutine("r-1", "Morning reset", ["mood"])]);

      renderWithProviders(<RoutineFab />);
      expect(screen.getByTestId("routine-fab")).toBeTruthy();

      completeTheOnlyStep();
      screen.rerender(<RoutineFab />);

      // The counter is gone; the checkmark acknowledgment took its place.
      expect(screen.queryByTestId("routine-fab")).toBeNull();
      expect(screen.getByTestId("routine-fab-complete")).toBeTruthy();
      expect(screen.getByLabelText("Routine complete")).toBeTruthy();
      expect(screen.queryByText("1/1")).toBeNull();

      // Still holding just before the 2.5s mark.
      act(() => {
        jest.advanceTimersByTime(2400);
      });
      expect(screen.getByTestId("routine-fab-complete")).toBeTruthy();

      // Hold elapses and the ~400ms fade completes - the button unmounts.
      act(() => {
        jest.advanceTimersByTime(100 + 400 + 100);
      });
      expect(screen.queryByTestId("routine-fab-complete")).toBeNull();

      // Pinned: it must NOT reappear on later renders while nothing is open.
      screen.rerender(<RoutineFab />);
      expect(screen.queryByTestId("routine-fab")).toBeNull();
      expect(screen.queryByTestId("routine-fab-complete")).toBeNull();
    });

    // #104: "all done" means all SCHEDULED routines done - an on-demand
    // routine's open steps must not hold the check back.
    it("plays the check when all scheduled routines finish, despite open on-demand steps", () => {
      setRoutines([
        makeRoutine("r-1", "Morning reset", ["mood"]),
        makeRoutine("r-2", "Reset kit", ["journal"], { cadence: "on-demand" }),
      ]);

      renderWithProviders(<RoutineFab />);
      expect(screen.getByText("0/1")).toBeTruthy();

      completeTheOnlyStep();
      screen.rerender(<RoutineFab />);

      expect(screen.queryByTestId("routine-fab")).toBeNull();
      expect(screen.getByTestId("routine-fab-complete")).toBeTruthy();
    });

    it("pressing the check opens the sheet on the routine that JUST finished", () => {
      // r-1 was already complete before this session's transition; r-2 is the
      // one finishing now. The sheet must show r-2's completion, not fall
      // back to views[0] (r-1).
      setRoutines([
        makeRoutine("r-1", "Morning reset", ["mood"]),
        makeRoutine("r-2", "Evening wind-down", ["journal"]),
      ]);
      mockUseRoutineToolRecords.mockReturnValue({
        moodLogs: [{ dayKey: currentDateKey() }],
      });

      renderWithProviders(<RoutineFab />);
      expect(screen.getByLabelText(/Evening wind-down/)).toBeTruthy();

      mockUseRoutineToolRecords.mockReturnValue({
        moodLogs: [{ dayKey: currentDateKey() }],
        journalEntries: [{ dayKey: currentDateKey() }],
      });
      screen.rerender(<RoutineFab />);

      fireEvent.press(screen.getByTestId("routine-fab-complete"));

      expect(screen.getByText("Evening wind-down")).toBeTruthy();
      expect(screen.queryByText("Morning reset")).toBeNull();
    });

    it("returns to the counter if steps open again while the check shows", () => {
      setRoutines([makeRoutine("r-1", "Morning reset", ["mood"])]);

      renderWithProviders(<RoutineFab />);
      completeTheOnlyStep();
      screen.rerender(<RoutineFab />);
      expect(screen.getByTestId("routine-fab-complete")).toBeTruthy();

      // A new open step (new routine) arrives mid-hold: count wins.
      setRoutines([
        makeRoutine("r-1", "Morning reset", ["mood"]),
        makeRoutine("r-2", "Evening wind-down", ["journal"]),
      ]);
      screen.rerender(<RoutineFab />);

      expect(screen.getByTestId("routine-fab")).toBeTruthy();
      expect(screen.queryByTestId("routine-fab-complete")).toBeNull();
      expect(screen.getByText("0/1")).toBeTruthy();
    });
  });

  // #670: the banner strips anchor at the bottom of the content column, where
  // the handle floats — it must offset above any visible banner, and settle
  // back to base when the banner goes away, all without a reload.
  describe("layered bottom inset (#1339)", () => {
    function hostBottom() {
      const host = screen.getByTestId("routine-fab-host");
      return (StyleSheet.flatten(host.props.style) as { bottom?: number }).bottom;
    }

    /**
     * Publish a measured top edge into the ladder. Direct store writes, because
     * jest's View is a class mock with no measureInWindow — the publisher hook's
     * own contract is covered in `layered-inset-store.test.tsx`.
     */
    function publishBelow(id: string, layer: InsetLayer, edge: number) {
      act(() => useLayeredInsetStore.getState().publishInset(id, layer, edge));
    }

    it("keeps its base position while no banner is visible", () => {
      setRoutines([makeRoutine("r-1", "Morning reset", ["mood"])]);

      renderWithProviders(<RoutineFab />);

      // Insets are 0 under the test SafeAreaProvider: base offset only.
      expect(hostBottom()).toBe(16);
      // Layer 2 published on the FIRST frame: RNW decides at mount whether a
      // view is observed, so a handler attached later is never heard.
      expect(screen.getByTestId("routine-fab-host").props.onLayout).toEqual(expect.any(Function));
    });

    it("rides above a visible banner and settles back when it disappears", () => {
      setRoutines([makeRoutine("r-1", "Morning reset", ["mood"])]);

      renderWithProviders(<RoutineFab />);

      publishBelow("banner-strip", INSET_LAYER.strip, 40);
      expect(hostBottom()).toBe(56);

      act(() => useLayeredInsetStore.getState().clearInset("banner-strip"));
      expect(hostBottom()).toBe(16);
    });

    it("clears the soft keyboard (#1339 layer 0)", () => {
      setRoutines([makeRoutine("r-1", "Morning reset", ["mood"])]);

      renderWithProviders(<RoutineFab />);

      publishBelow("keyboard", INSET_LAYER.keyboard, 336);
      expect(hostBottom()).toBe(352);
    });

    it("maxes overlapping layer-1 publishers rather than summing them", () => {
      setRoutines([makeRoutine("r-1", "Morning reset", ["mood"])]);

      renderWithProviders(<RoutineFab />);

      // The cookie banner is `fixed bottom-0`, so it OVERLAPS the banner strip
      // instead of stacking on it; summing 40 + 120 would be 64px too high.
      publishBelow("banner-strip", INSET_LAYER.strip, 40);
      publishBelow("cookie-banner", INSET_LAYER.strip, 120);

      expect(hostBottom()).toBe(136);
    });

    it("☠️ cannot see its own layer — the climbing loop is structurally unreachable", () => {
      setRoutines([makeRoutine("r-1", "Morning reset", ["mood"])]);

      renderWithProviders(<RoutineFab />);

      // What a flat max would do: the FAB publishes its own top edge, reads it
      // back, moves up, publishes higher - forever. Layer 2 is invisible to a
      // layer-2 consumer, so this changes nothing at all.
      publishBelow("reminder-prompt", INSET_LAYER.floater, 500);
      publishBelow("routine-fab-itself", INSET_LAYER.floater, 900);

      expect(hostBottom()).toBe(16);
    });
  });
});
