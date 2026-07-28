import type { CapturedOffsetMinutes } from "@/src/lib/occurrence-time";

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

/** What an already-saved activity holds for its schedule, as far as this decision cares. */
export interface StoredSchedule {
  scheduledAt: string | null;
  scheduledOffsetMinutes: CapturedOffsetMinutes;
}

/** A resolved schedule to save. The offset is nullable here because a carried-through one may be. */
export interface ResolvedSchedule {
  scheduledAt: string;
  scheduledOffsetMinutes: CapturedOffsetMinutes;
}

/**
 * Decide what to store for the schedule field on save.
 *
 * Re-parsing the field every time is right for a NEW plan and wrong for an EDIT.
 * The field was rendered from the stored instant through `isoToScheduleInput`,
 * which formats in the viewer's CURRENT zone - so parsing that text back
 * captures the offset in force where the editor now stands, not where the plan
 * was made. Schedule "Tuesday 19:00" in Tokyo, fly to London, change only the
 * notes, and the instant survives the round trip while the offset is silently
 * replaced, moving `scheduledDayKey` onto a different civil day. That is exactly
 * the travel case the captured offset exists to prevent (#330), so an unrelated
 * edit must not trigger it.
 *
 * When the text still renders identically to the stored instant, nothing about
 * the plan's time was touched and the stored pair is carried through unchanged -
 * including a null offset, which stays null rather than being back-filled from
 * wherever the editor happens to be. A null means "never captured" and guessing
 * it is the mistake 20260726 had to undo.
 *
 * Any real change to the text re-parses, which is correct: the user is picking a
 * new time, here, now.
 */
export function resolveScheduleOccurrence(
  text: string | null,
  stored: StoredSchedule | null | undefined,
): ResolvedSchedule | null {
  if (
    stored?.scheduledAt &&
    text != null &&
    text.trim() === isoToScheduleInput(stored.scheduledAt)
  ) {
    return {
      scheduledAt: stored.scheduledAt,
      scheduledOffsetMinutes: stored.scheduledOffsetMinutes,
    };
  }
  return scheduleInputToOccurrence(text);
}
