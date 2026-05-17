import { useLocalSearchParams } from "expo-router";

import { HabitEditorScreen } from "@/src/features/habits/habit-editor-screen";

export default function EditHabitRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = typeof id === "string" ? id : null;

  return (
    <HabitEditorScreen
      fallbackHref={habitId ? `/tools/habits/${habitId}` : "/tools/habits"}
      habitId={habitId}
      mode="edit"
    />
  );
}
