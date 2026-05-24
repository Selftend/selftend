import { useLocalSearchParams } from "expo-router";

import { HabitLogNoteScreen } from "@/src/features/habits/habit-log-note-screen";
import { useSelectedDate } from "@/src/stores/selected-date-store";

export default function HabitLogNoteRoute() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const { selectedDate } = useSelectedDate();
  if (typeof id !== "string" || !id) return null;
  // Explicit `date` param takes priority (deep-links); otherwise default to the
  // app-wide selected date rather than hardcoded today.
  const resolvedDate = typeof date === "string" && date ? date : selectedDate;
  return <HabitLogNoteScreen habitId={id} dateOverride={resolvedDate} />;
}
