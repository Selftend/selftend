import { useLocalSearchParams } from "expo-router";

import { RoutineEditorScreen } from "@/src/features/routines/routine-editor-screen";

export default function EditRoutineRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routineId = typeof id === "string" ? id : null;

  return (
    <RoutineEditorScreen
      fallbackHref={routineId ? `/routines/${routineId}` : "/routines"}
      mode="edit"
      routineId={routineId}
    />
  );
}
