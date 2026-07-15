import {
  deriveRoutine,
  type RoutineDayView,
  type SteppableToolId,
} from "@/src/features/routines/derive";
import { useRoutines } from "@/src/features/routines/queries";
import type { RoutineWithSteps } from "@/src/features/routines/types";
import { useRoutineToolRecords } from "@/src/features/routines/use-routine-tool-records";
import { currentDateKey } from "@/src/utils/date";

/** One routine plus its derived status for the current local day. */
export interface RoutineTodayView {
  routine: RoutineWithSteps;
  day: RoutineDayView;
}

export interface RoutinesToday {
  isLoading: boolean;
  hasRoutines: boolean;
  views: RoutineTodayView[];
  /** Steps done today across ALL routines (the FAB's aggregate N). */
  doneSteps: number;
  /** Steps across all routines (the FAB's aggregate M). */
  totalSteps: number;
  /** Steps still open today; the FAB is visible only while this is > 0. */
  openSteps: number;
  /** At least one step exists and every step is done - the widget's calm "done for today". */
  allComplete: boolean;
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

  const views = allRoutines.map((routine) => ({
    routine,
    day: deriveRoutine(routine.steps, records, dayKey),
  }));

  let doneSteps = 0;
  let totalSteps = 0;
  for (const view of views) {
    doneSteps += view.day.doneCount;
    totalSteps += view.day.totalCount;
  }

  return {
    isLoading,
    hasRoutines: allRoutines.length > 0,
    views,
    doneSteps,
    totalSteps,
    openSteps: totalSteps - doneSteps,
    allComplete: totalSteps > 0 && doneSteps === totalSteps,
  };
}
