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
 * Compatibility hook for day-scoped screens while occurrence-time fields are
 * migrated. There is deliberately no global selected-date state: Home and module
 * dashboards always describe the device's current local day.
 */
export function useSelectedDate() {
  return { selectedDate: currentDateKey(), isToday: true };
}
