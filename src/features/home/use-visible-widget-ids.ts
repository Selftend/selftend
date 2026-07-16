import { useRoutinesToday } from "@/src/features/routines/use-routines-today";

const ROUTINES_WIDGET_ID = "routines-today";

/**
 * The widget ids the Home grid should actually render today. The grid wraps
 * every id in a fixed-height slot, so a widget that renders null still leaves
 * a blank gap - day-level suppression must happen HERE, at the grid level,
 * not inside the widget.
 *
 * Currently only routines-today self-suppresses (#104/#97): on days where
 * the user HAS routines but none are scheduled (off-day custom cadences,
 * on-demand-only), its slot is dropped entirely - no gap, no placeholder.
 * The zero-routines onboarding doorway still renders, and the routines query
 * only runs when the user actually owns the widget.
 */
export function useVisibleWidgetIds(userId: string | null, widgetIds: string[]): string[] {
  const hasRoutinesWidget = widgetIds.includes(ROUTINES_WIDGET_ID);
  const routines = useRoutinesToday(hasRoutinesWidget ? userId : null);

  const routinesSuppressed =
    hasRoutinesWidget &&
    !routines.isLoading &&
    routines.hasRoutines &&
    routines.scheduledViews.length === 0;

  if (!routinesSuppressed) return widgetIds;
  return widgetIds.filter((id) => id !== ROUTINES_WIDGET_ID);
}
