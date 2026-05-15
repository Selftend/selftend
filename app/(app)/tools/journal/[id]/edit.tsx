import { useLocalSearchParams } from "expo-router";

import { JournalEntryEditorScreen } from "@/src/features/journal/journal-entry-editor-screen";

export default function EditJournalEntryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = typeof id === "string" ? id : null;

  return (
    <JournalEntryEditorScreen
      fallbackHref={entryId ? `/tools/journal/${entryId}` : "/tools/journal"}
      mode="edit"
      entryId={entryId}
    />
  );
}
