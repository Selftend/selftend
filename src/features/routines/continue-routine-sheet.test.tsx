import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { ContinueRoutineSheet } from "@/src/features/routines/continue-routine-sheet";
import {
  deriveRoutine,
  type RoutineToolRecords,
  type SteppableToolId,
} from "@/src/features/routines/derive";
import { useUpdateRoutine } from "@/src/features/routines/queries";
import type { RoutineCadence, RoutineWithSteps } from "@/src/features/routines/types";
import type { RoutineTodayView } from "@/src/features/routines/use-routines-today";
import { currentDateKey } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/routines",
}));

jest.mock("@/src/features/routines/queries", () => ({
  useUpdateRoutine: jest.fn(),
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

const mockRouter = jest.mocked(router);
const mockUseUpdateRoutine = useUpdateRoutine as jest.MockedFunction<typeof useUpdateRoutine>;

function makeRoutine(
  id: string,
  name: string,
  toolIds: readonly SteppableToolId[],
  reminderEnabled = false,
  cadence: RoutineCadence = "daily",
): RoutineWithSteps {
  return {
    id,
    userId: "user-1",
    name,
    reminderEnabled,
    reminderHour: reminderEnabled ? 8 : null,
    reminderMinute: reminderEnabled ? 30 : null,
    reminderTimezone: reminderEnabled ? "Europe/Sofia" : null,
    cadence,
    customDays: [],
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

function view(
  routine: RoutineWithSteps,
  records: RoutineToolRecords = {},
  scheduledToday = true,
): RoutineTodayView {
  return { routine, day: deriveRoutine(routine.steps, records, currentDateKey()), scheduledToday };
}

function renderSheet(views: RoutineTodayView[], onClose = jest.fn()) {
  renderWithProviders(
    <ContinueRoutineSheet userId="user-1" views={views} visible onClose={onClose} />,
  );
  return onClose;
}

describe("ContinueRoutineSheet", () => {
  const mutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mutateAsync.mockResolvedValue(undefined);
    mockUseUpdateRoutine.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateRoutine>);
  });

  it("lists the whole ordered step list with the next open step highlighted", () => {
    // Journal (step 1) is done; mood (step 2) is the next open step.
    const records: RoutineToolRecords = {
      journalEntries: [{ dayKey: currentDateKey() }],
    };
    renderSheet([
      view(makeRoutine("r-1", "Morning reset", ["journal", "mood", "gratitude"]), records),
    ]);

    expect(screen.getByText("Continue your routine")).toBeTruthy();
    expect(screen.getByText("Journal")).toBeTruthy();
    expect(screen.getByText("Mood check-in")).toBeTruthy();
    expect(screen.getByText("Gratitude")).toBeTruthy();
    // Exactly one "Next" badge, and one done step.
    expect(screen.getAllByText("Next")).toHaveLength(1);
    expect(screen.getAllByText("Done today")).toHaveLength(1);
    expect(screen.getAllByText("Not yet today")).toHaveLength(2);
  });

  it("routes the Do-next-step CTA to the next open step's tool and closes", () => {
    const records: RoutineToolRecords = {
      journalEntries: [{ dayKey: currentDateKey() }],
    };
    const onClose = renderSheet([
      view(makeRoutine("r-1", "Morning reset", ["journal", "mood"]), records),
    ]);

    fireEvent.press(screen.getByText("Do next step"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/check-in/new");
    expect(onClose).toHaveBeenCalled();
  });

  it.each([
    ["breathing", "/tools/breathing"],
    ["cbt", "/modules/cbt/new"],
    ["habits", "/tools/habits"],
  ] as const)("routes a %s step to %s", (toolId, route) => {
    renderSheet([view(makeRoutine("r-1", "One step", [toolId]))]);

    fireEvent.press(screen.getByText("Do next step"));

    expect(mockRouter.push).toHaveBeenCalledWith(route);
  });

  it("starts on the first open routine and switches via the chip row", () => {
    // r-1 is fully complete; r-2 and r-3 are open, so the sheet starts on r-2.
    const records: RoutineToolRecords = {
      moodLogs: [{ dayKey: currentDateKey() }],
    };
    renderSheet([
      view(makeRoutine("r-1", "Check-in only", ["mood"]), records),
      view(makeRoutine("r-2", "Evening wind-down", ["journal"]), records),
      view(makeRoutine("r-3", "Slow down", ["breathing"]), records),
    ]);

    expect(screen.getByText("Journal")).toBeTruthy();

    fireEvent.press(screen.getByText("Slow down"));
    expect(screen.getByText("Breathing")).toBeTruthy();

    fireEvent.press(screen.getByText("Do next step"));
    expect(mockRouter.push).toHaveBeenCalledWith("/tools/breathing");
  });

  // #121: the sheet starts on the routine the FAB counts - an in-progress
  // routine outranks an earlier not-started one, including on the very first
  // visible frame (the pre-pin fallback selects through the same helper).
  it("starts on the in-progress routine, not the first open one", () => {
    // r-1 is untouched; r-2 has its mood step done (1/2 in progress).
    const records: RoutineToolRecords = {
      moodLogs: [{ dayKey: currentDateKey() }],
    };
    renderSheet([
      view(makeRoutine("r-1", "Morning reset", ["journal"]), records),
      view(makeRoutine("r-2", "Evening wind-down", ["mood", "gratitude"]), records),
    ]);

    // r-2's open step is highlighted; r-1's journal shows only as its chip.
    expect(screen.getByText("Gratitude")).toBeTruthy();
    expect(screen.queryByText("Journal")).toBeNull();
  });

  // #104: unscheduled routines never surface - not as the starting routine
  // and not in the chip row - however many open steps they have.
  it("skips unscheduled routines when starting and offers no chip for them", () => {
    // r-1 is NOT scheduled today (e.g. on-demand) yet fully open; r-2 is the
    // only scheduled routine. The sheet must start on r-2 and, with a single
    // switchable candidate, show no chip row at all (no "Reset kit" chip).
    renderSheet([
      view(makeRoutine("r-1", "Reset kit", ["journal"]), {}, false),
      view(makeRoutine("r-2", "Morning reset", ["mood"])),
    ]);

    expect(screen.getByText("Morning reset")).toBeTruthy();
    expect(screen.getByText("Mood check-in")).toBeTruthy();
    expect(screen.queryByText("Reset kit")).toBeNull();
    expect(screen.queryByText("Journal")).toBeNull();

    fireEvent.press(screen.getByText("Do next step"));
    expect(mockRouter.push).toHaveBeenCalledWith("/tools/check-in/new");
  });

  it("offers the routine's reminder on completion and writes only on accept", async () => {
    const records: RoutineToolRecords = {
      moodLogs: [{ dayKey: currentDateKey() }],
    };
    const onClose = renderSheet([view(makeRoutine("r-1", "Morning reset", ["mood"]), records)]);

    expect(screen.getByText("That was the last step")).toBeTruthy();
    expect(screen.queryByText("Do next step")).toBeNull();

    fireEvent.press(screen.getByText("Set a daily reminder"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        id: "r-1",
        patch: expect.objectContaining({
          reminderEnabled: true,
          reminderHour: expect.any(Number),
          reminderMinute: expect.any(Number),
          reminderTimezone: "Europe/Sofia",
        }),
      });
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("never writes reminder fields on decline", () => {
    const records: RoutineToolRecords = {
      moodLogs: [{ dayKey: currentDateKey() }],
    };
    const onClose = renderSheet([view(makeRoutine("r-1", "Morning reset", ["mood"]), records)]);

    fireEvent.press(screen.getByText("Not now"));

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  // The sheet's DEFENSIVE contract, not an app path (#1542): the FAB is the
  // sheet's only mount point and it passes `scheduledViews`, so an on-demand
  // routine never actually arrives here - routine-fab.test.tsx pins that. This
  // test hands one in directly to prove the guard holds if that ever widens, so
  // the #102 rule (on-demand routines never nudge) cannot be lost by accident.
  //
  // ☠️ `scheduledToday` MUST stay false: an on-demand view with
  // `scheduledToday: true` is a state `useRoutinesToday` can never build
  // (`isScheduledOn` returns false for on-demand before anything else), and
  // pinning the guard against an impossible input proves nothing.
  it("skips the offer for an on-demand routine handed in directly (#102)", () => {
    const records: RoutineToolRecords = {
      moodLogs: [{ dayKey: currentDateKey() }],
    };
    renderSheet([
      view(makeRoutine("r-1", "Morning reset", ["mood"], false, "on-demand"), records, false),
    ]);

    // Completion state shows, but an on-demand routine never nudges - so no
    // reminder offer, just the Close button (same branch as reminderEnabled).
    expect(screen.getByText("That was the last step")).toBeTruthy();
    expect(screen.queryByText("Set a daily reminder")).toBeNull();
    expect(screen.queryByText("Not now")).toBeNull();
    expect(screen.getByText("Close")).toBeTruthy();
  });

  it("skips the offer when the routine already has its reminder set", () => {
    const records: RoutineToolRecords = {
      moodLogs: [{ dayKey: currentDateKey() }],
    };
    renderSheet([view(makeRoutine("r-1", "Morning reset", ["mood"], true), records)]);

    expect(screen.getByText("That was the last step")).toBeTruthy();
    expect(screen.queryByText("Set a daily reminder")).toBeNull();
    expect(screen.getByText("Close")).toBeTruthy();
  });
});
