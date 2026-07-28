function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format an ISO timestamp as the "YYYY-MM-DD HH:MM" LOCAL-time text the scheduler shows. */
export function isoToScheduleInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The instant a plan was set for, plus the civil day it was meant to fall on. */
export interface ScheduleOccurrence {
  scheduledAt: string;
  /** Minutes east of UTC at the place the user picked the time. */
  scheduledOffsetMinutes: number;
}

/**
 * Parse the scheduler's "YYYY-MM-DD HH:MM" text as LOCAL time → an ISO instant, or null if
 * blank/unparseable. Storing an unambiguous instant (not the tz-naive raw text) keeps the
 * scheduled time correct across timezones and consistent with every other stored timestamp.
 *
 * That still holds, and the instant is still what orders the list and renders the time of
 * day. What it alone cannot answer is which civil DAY the user meant: an instant re-read
 * after travel lands on whatever day it falls on where you now stand, so "Tuesday 7pm"
 * planned in Tokyo reads as Monday once you land in London. Behavioural activation asks
 * "did I do the thing I planned for that day", so the day is the unit of the intervention
 * and has to be frozen too (#330 owner decision, 2026-07-28).
 *
 * The offset is therefore returned ALONGSIDE the instant, from the same parse - two facts
 * about one plan, neither derivable from the other, and nothing about the stored instant
 * changes. Reading the offset from a second `new Date()` instead would give the offset in
 * force NOW rather than at the scheduled instant: schedule a July evening from a December
 * device across a DST boundary and the pair would describe two different clocks.
 */
export function scheduleInputToOccurrence(text: string | null): ScheduleOccurrence | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  // Space → "T" (with no trailing Z) so Date parses it in the viewer's LOCAL timezone.
  const d = new Date(trimmed.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  return {
    scheduledAt: d.toISOString(),
    // Resolved at the scheduled instant, not at "now" - see above.
    scheduledOffsetMinutes: -d.getTimezoneOffset(),
  };
}
