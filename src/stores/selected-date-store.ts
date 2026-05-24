import { create } from "zustand";

/** Today's date key in `YYYY-MM-DD` (matches the app's existing `new Date().toISOString().slice(0,10)` convention). */
export function currentDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Timestamp for an entry logged "on" the selected day: today -> now;
 * a past day -> that date at the current wall-clock time (keeps intra-day order sensible).
 */
export function loggedAtForSelectedDate(selectedDate: string): string {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (selectedDate === today) return now.toISOString();
  return `${selectedDate}T${now.toISOString().slice(11)}`;
}

interface SelectedDateState {
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  resetToToday: () => void;
}

export const useSelectedDateStore = create<SelectedDateState>((set) => ({
  selectedDate: currentDateKey(),
  setSelectedDate: (date) =>
    set(() => {
      const today = currentDateKey();
      return { selectedDate: date > today ? today : date };
    }),
  resetToToday: () => set({ selectedDate: currentDateKey() }),
}));

/** Convenience hook for screens/components. */
export function useSelectedDate() {
  const selectedDate = useSelectedDateStore((s) => s.selectedDate);
  return { selectedDate, isToday: selectedDate === currentDateKey() };
}
