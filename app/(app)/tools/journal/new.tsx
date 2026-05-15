import { JournalEntryEditorScreen } from "@/src/features/journal/journal-entry-editor-screen";

export default function NewJournalEntryRoute() {
  return <JournalEntryEditorScreen fallbackHref="/tools/journal" mode="create" />;
}
