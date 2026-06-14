import { create } from "zustand";

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

interface SelectedDateState {
  selectedDate: string; // YYYY-MM-DD
  /** True once the user has explicitly chosen a specific day; false means "live-track today". */
  userPicked: boolean;
  setSelectedDate: (date: string) => void;
  resetToToday: () => void;
}

export const useSelectedDateStore = create<SelectedDateState>((set) => ({
  selectedDate: currentDateKey(),
  userPicked: false,
  setSelectedDate: (date) =>
    set(() => {
      const today = currentDateKey();
      return { selectedDate: date > today ? today : date, userPicked: true };
    }),
  resetToToday: () => set({ selectedDate: currentDateKey(), userPicked: false }),
}));

/**
 * Convenience hook for screens/components.
 *
 * When the user has NOT explicitly picked a day (the default, or after "Today"),
 * the selected date live-tracks the current local date - so a session that crosses
 * midnight reports today, not the stale day the store was initialized on. (Writers
 * anchor "today's" entries to this value, so a stale date would silently backdate
 * them; see selected-date-store.test.ts.)
 */
export function useSelectedDate() {
  const stored = useSelectedDateStore((s) => s.selectedDate);
  const userPicked = useSelectedDateStore((s) => s.userPicked);
  const today = currentDateKey();
  const selectedDate = !userPicked && stored !== today ? today : stored;
  return { selectedDate, isToday: selectedDate === today };
}
