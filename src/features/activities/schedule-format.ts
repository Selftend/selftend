function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format an ISO timestamp as the "YYYY-MM-DD HH:MM" LOCAL-time text the scheduler shows. */
export function isoToScheduleInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Parse the scheduler's "YYYY-MM-DD HH:MM" text as LOCAL time → an ISO instant, or null if
 * blank/unparseable. Storing an unambiguous instant (not the tz-naive raw text) keeps the
 * scheduled time correct across timezones and consistent with every other stored timestamp.
 */
export function scheduleInputToIso(text: string | null): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  // Space → "T" (with no trailing Z) so Date parses it in the viewer's LOCAL timezone.
  const d = new Date(trimmed.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
