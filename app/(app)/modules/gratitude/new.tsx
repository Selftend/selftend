import { useLocalSearchParams } from "expo-router";

import { GratitudeEntryEditorScreen } from "@/src/features/gratitude/gratitude-entry-editor-screen";
import type { GratitudeLevel } from "@/src/features/modules/types";

export default function NewGratitudeEntryRoute() {
  const { level } = useLocalSearchParams<{ level?: string }>();
  const defaultLevel: GratitudeLevel = level === "1" ? 1 : level === "2" ? 2 : 3;
  return (
    <GratitudeEntryEditorScreen
      fallbackHref="/modules/gratitude"
      mode="create"
      defaultLevel={defaultLevel}
    />
  );
}
