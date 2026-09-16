import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { ContinueRoutineSheet } from "@/src/features/routines/continue-routine-sheet";
import {
  deriveRoutine,
  type RoutineToolRecords,
  type SteppableToolId,
} from "@/src/features/routines/derive";
import type { RoutineCadence, RoutineWithSteps } from "@/src/features/routines/types";
import type { RoutineTodayView } from "@/src/features/routines/use-routines-today";
import { currentDateKey } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/routines",
}));

// The async AccessibilityInfo probe resolves after the test ends, tripping the
// act() guard - pin it like the other sheet tests do.
jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: () => false,
}));

const mockRouter = jest.mocked(router);

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
  renderWithProviders(<ContinueRoutineSheet views={views} visible onClose={onClose} />);
  return onClose;
}

describe("ContinueRoutineSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  // The completion moment states the record and stops (ADR-0008, ADR-0010,
  // #2488). One branch serves every completed routine - reminder off, reminder
  // on, on-demand - and it holds the body and a Close, nothing to answer. The
  // routine's reminder is manual only, set from the routine's own editor.
  //
  // ☠️ The pin is the CONTROL COUNT, not the absence of the old strings: the
  // five `sheet.reminder*` keys are gone from both locales, so a
  // `queryByText("Set a daily reminder")` would be null however the sheet
  // behaved. An accept, a decline or a time field can only come back as
  // another pressable, and the count is what notices.
  //
  // ☠️ `scheduledToday` MUST stay false for the on-demand row: an on-demand
  // view with `scheduledToday: true` is a state `useRoutinesToday` can never
  // build (`isScheduledOn` returns false for on-demand before anything else),
  // and pinning against an impossible input proves nothing. #102 - on-demand
  // routines never nudge - is enforced upstream by the FAB's scheduled-today
  // filter, and routine-fab.test.tsx pins it there by name.
  it.each([
    ["a reminder-off routine", false, "daily", true],
    ["a reminder-on routine", true, "daily", true],
    ["an on-demand routine", false, "on-demand", false],
  ] as const)(
    "shows the record and a Close, and asks nothing, for %s",
    (_label, reminderEnabled, cadence, scheduledToday) => {
      const records: RoutineToolRecords = {
        moodLogs: [{ dayKey: currentDateKey() }],
      };
      renderSheet([
        view(
          makeRoutine("r-1", "Morning reset", ["mood"], reminderEnabled, cadence),
          records,
          scheduledToday,
        ),
      ]);

      expect(screen.getByText("That was the last step")).toBeTruthy();
      expect(
        screen.getByText(`"Morning reset" came together today. There's nothing more to do here.`),
      ).toBeTruthy();
      expect(screen.queryByText("Do next step")).toBeNull();

      // Everything pressable on the completed sheet: the backdrop, the header's
      // X, and the one Close button - the only one carrying a label of its own.
      expect(screen.getAllByRole("button")).toHaveLength(3);
      expect(screen.getAllByText("Close")).toHaveLength(1);
    },
  );
});
