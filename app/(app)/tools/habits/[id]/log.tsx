import { useLocalSearchParams } from "expo-router";

import { HabitLogNoteScreen } from "@/src/features/habits/habit-log-note-screen";

export default function HabitLogNoteRoute() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  if (typeof id !== "string" || !id) return null;
  return (
    <HabitLogNoteScreen
      habitId={id}
      dateOverride={typeof date === "string" && date ? date : undefined}
    />
  );
}
