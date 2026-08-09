import { useLocalSearchParams } from "expo-router";

import { HabitLogNoteScreen } from "@/src/features/habits/habit-log-note-screen";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { isValidDayKey } from "@/src/utils/date";

export default function HabitLogNoteRoute() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const { selectedDate } = useSelectedDate();
  if (typeof id !== "string" || !id) return null;
  // Explicit `date` param takes priority (deep-links); otherwise default to the
  // app-wide selected date rather than hardcoded today.
  //
  // ⚠️ Validated, not trusted. `?date=bogus` rides straight into
  // `Intl.DateTimeFormat`, which throws a `RangeError` on an invalid Date and
  // takes the whole route down before any error state can render - and into a
  // Supabase range filter and the save. A junk day key names no day, so the
  // honest fallback is the day the user is actually on.
  const resolvedDate = typeof date === "string" && isValidDayKey(date) ? date : selectedDate;
  return <HabitLogNoteScreen habitId={id} dateOverride={resolvedDate} />;
}
