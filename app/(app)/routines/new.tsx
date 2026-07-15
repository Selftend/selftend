import { RoutineEditorScreen } from "@/src/features/routines/routine-editor-screen";

export default function NewRoutineRoute() {
  return <RoutineEditorScreen fallbackHref="/routines" mode="create" />;
}
