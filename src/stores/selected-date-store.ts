import { localDateKey, currentDateKey, toLocalDateKey } from "@/src/utils/date";

export { localDateKey, currentDateKey, toLocalDateKey };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Timestamp for an entry logged "on" the selected day, anchored to that LOCAL
 * date: today -> now; a past day -> that date at the current local time-of-day
 * (keeps intra-day order sensible). The result's local date is always `selectedDate`.
 */
export function loggedAtForSelectedDate(selectedDate: string): string {
  const now = new Date();
  if (selectedDate === currentDateKey()) return now.toISOString();
  // Parsed as local time (no trailing Z), so its local date is `selectedDate`.
  return new Date(
    `${selectedDate}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  ).toISOString();
}

/**
 * The day a screen is describing. There is deliberately no global selected-date
 * state: Home and module dashboards always describe the device's current local
 * day, which is the right frame for "what am I looking at now" even though
 * entries themselves are filed under the civil day they were captured on (#250).
 *
 * It used to return `isToday: true` alongside, and 37 files import this hook, so
 * consumers branched on a literal - every else-arm was unreachable and several
 * translated strings could never render (#720). Worse, six test files mocked
 * `isToday: false`, so the suite proved behaviour production could not reach and
 * the branches read as live.
 *
 * The value is not returned any more. A component that is *handed* a date still
 * asks the honest question - `dayKey === currentDateKey()` - because that is a
 * fact it can check about its own input, and it starts varying for free if a
 * screen ever renders a day other than today. A screen that simply *is* today
 * says so directly instead of testing a constant.
 */
export function useSelectedDate() {
  return { selectedDate: currentDateKey() };
}
