import { useLocalSearchParams } from "expo-router";

import { GratitudeEntryEditorScreen } from "@/src/features/gratitude/gratitude-entry-editor-screen";

export default function EditGratitudeEntryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = typeof id === "string" ? id : null;

  return (
    <GratitudeEntryEditorScreen
      fallbackHref={entryId ? `/tools/gratitude-log/${entryId}` : "/tools/gratitude-log"}
      mode="edit"
      entryId={entryId}
    />
  );
}
