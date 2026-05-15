import { MoodEntryEditorScreen } from "@/src/features/mood/mood-entry-editor-screen";

export default function NewMoodEntryRoute() {
  return <MoodEntryEditorScreen fallbackHref="/tools/mood-tracker" mode="create" />;
}
