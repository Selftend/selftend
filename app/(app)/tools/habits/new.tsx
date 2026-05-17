import { HabitEditorScreen } from "@/src/features/habits/habit-editor-screen";

export default function NewHabitRoute() {
  return <HabitEditorScreen fallbackHref="/tools/habits" mode="create" />;
}
