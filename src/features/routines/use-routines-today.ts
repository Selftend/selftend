import {
  deriveRoutine,
  type RoutineDayView,
  type SteppableToolId,
} from "@/src/features/routines/derive";
import { useRoutines } from "@/src/features/routines/queries";
import { isScheduledOn } from "@/src/features/routines/scheduling";
import type { RoutineWithSteps } from "@/src/features/routines/types";
import { useRoutineToolRecords } from "@/src/features/routines/use-routine-tool-records";
import { currentDateKey } from "@/src/utils/date";

/** One routine plus its derived status for the current local day. */
export interface RoutineTodayView {
  routine: RoutineWithSteps;
  day: RoutineDayView;
  /**
   * Derived, never stored (#96): the routine's cadence puts it on today's
   * schedule. On-demand routines are never scheduled; the FAB, continue
   * sheet, and Home widget surface ONLY scheduled-today routines.
   */
  scheduledToday: boolean;
}

export interface RoutinesToday {
  isLoading: boolean;
  hasRoutines: boolean;
  /** Every routine's derived view, schedule-blind (deriveRoutine stays untouched). */
  views: RoutineTodayView[];
  /** Only the routines scheduled today - what the FAB/sheet/widget surface (#104). */
  scheduledViews: RoutineTodayView[];
  /** Steps done today across all SCHEDULED-TODAY routines (the FAB's aggregate N). */
  doneSteps: number;
  /** Steps across all scheduled-today routines (the FAB's aggregate M). */
  totalSteps: number;
  /** Scheduled steps still open today; the FAB is visible only while this is > 0. */
  openSteps: number;
  /** At least one scheduled step exists and every one is done - the calm "done for today". */
  allComplete: boolean;
}

/**
 * The routine the continue sheet pins when it opens - and the one the FAB
 * counts (#91): the two must select through this helper so the number on the
 * button and the routine the sheet opens on can never diverge. Selection
 * (#121): the first IN-PROGRESS scheduled routine today (some steps done,
 * some open) wins - the FAB follows what the user is actually doing - else
 * the first open one by routine order. Unscheduled routines never qualify
 * (#104): open steps on an on-demand or off-today routine must not surface.
 */
export function firstOpenRoutineView(views: RoutineTodayView[]): RoutineTodayView | null {
  const open = openScheduledViews(views);
  return open.find((view) => view.day.doneCount > 0) ?? open[0] ?? null;
}

/**
 * Every routine scheduled today that still has an open step - the FAB's
 * queue (#121): it counts the first (per firstOpenRoutineView) and shows the
 * rest as a "+N" suffix.
 */
export function openScheduledViews(views: RoutineTodayView[]): RoutineTodayView[] {
  return views.filter((view) => view.scheduledToday && view.day.nextStep !== null);
}

/**
 * The shared today-aggregate behind the routines-today Home widget and the
 * floating routine-progress button (spec #37 Home integration, issue #50):
 * every routine's derived day view plus the cross-routine step totals. Purely
 * derived client-side via deriveRoutine; nothing is persisted.
 */
export function useRoutinesToday(userId: string | null): RoutinesToday {
  const { data: routines, isLoading } = useRoutines(userId);
  const allRoutines = routines ?? [];

  // One record fetch per tool any routine references (mirrors the routines
  // home screen); deriveRoutine reads them all.
  const referencedTools: SteppableToolId[] = [];
  for (const routine of allRoutines) {
    for (const step of routine.steps) {
      if (!referencedTools.includes(step.toolId)) referencedTools.push(step.toolId);
    }
  }
  const records = useRoutineToolRecords(userId, referencedTools);
  const dayKey = currentDateKey();
  const today = new Date();

  const views = allRoutines.map((routine) => ({
    routine,
    day: deriveRoutine(routine.steps, records, dayKey),
    scheduledToday: isScheduledOn(routine, today),
  }));
  const scheduledViews = views.filter((view) => view.scheduledToday);

  // Aggregates count SCHEDULED routines only (#104): an open step on an
  // on-demand or off-today routine must neither show the FAB nor block the
  // widget's "done for today".
  let doneSteps = 0;
  let totalSteps = 0;
  for (const view of scheduledViews) {
    doneSteps += view.day.doneCount;
    totalSteps += view.day.totalCount;
  }

  return {
    isLoading,
    hasRoutines: allRoutines.length > 0,
    views,
    scheduledViews,
    doneSteps,
    totalSteps,
    openSteps: totalSteps - doneSteps,
    allComplete: totalSteps > 0 && doneSteps === totalSteps,
  };
}
