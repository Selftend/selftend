import { GratitudeEntryEditorScreen } from "@/src/features/gratitude/gratitude-entry-editor-screen";

export default function NewGratitudeEntryRoute() {
  return <GratitudeEntryEditorScreen fallbackHref="/modules/gratitude" mode="create" />;
}
