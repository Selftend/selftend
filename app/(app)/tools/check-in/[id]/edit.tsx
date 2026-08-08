import { useLocalSearchParams } from "expo-router";

import { MoodEntryEditorScreen } from "@/src/features/mood/mood-entry-editor-screen";

export default function EditMoodEntryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const moodId = typeof id === "string" ? id : null;

  return (
    <MoodEntryEditorScreen
      fallbackHref={moodId ? `/tools/check-in/${moodId}` : "/tools/check-in"}
      mode="edit"
      moodId={moodId}
    />
  );
}
