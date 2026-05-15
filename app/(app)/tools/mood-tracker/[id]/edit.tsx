import { useLocalSearchParams } from "expo-router";

import { MoodEntryEditorScreen } from "@/src/features/mood/mood-entry-editor-screen";

export default function EditMoodEntryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const moodId = typeof id === "string" ? id : null;

  return (
    <MoodEntryEditorScreen
      fallbackHref={moodId ? `/tools/mood-tracker/${moodId}` : "/tools/mood-tracker"}
      mode="edit"
      moodId={moodId}
    />
  );
}
