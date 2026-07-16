import { act, fireEvent, screen } from "@testing-library/react-native";

import { RoutineFab } from "@/src/components/app/routine-fab";
import { useRoutines } from "@/src/features/routines/queries";
import type { RoutineWithSteps } from "@/src/features/routines/types";
import { useRoutineToolRecords } from "@/src/features/routines/use-routine-tool-records";
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
): RoutineWithSteps {
  return {
    id,
    userId: "user-1",
    name,
    reminderEnabled: false,
    reminderHour: null,
    reminderMinute: null,
    reminderTimezone: null,
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
      moodLogs: [{ loggedAt: `${currentDateKey()}T08:00:00` }],
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
      moodLogs: [{ loggedAt: `${currentDateKey()}T08:00:00` }],
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
      moodLogs: [{ loggedAt: `${currentDateKey()}T08:00:00` }],
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

  // #90: the FAB never renders over data-entry screens - it covered
  // MobileFormScreen's sticky Save footer (e.g. the mood editor on mobile).
  describe("data-entry route suppression (#90)", () => {
    beforeEach(() => {
      setRoutines([makeRoutine("r-1", "Morning reset", ["mood"])]);
    });

    it.each([
      ["/tools/mood-tracker/new", "a creation form"],
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
        moodLogs: [{ loggedAt: `${currentDateKey()}T08:00:00` }],
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
});
