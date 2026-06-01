import { useLocalSearchParams } from "expo-router";

import { BreathingExerciseEditorScreen } from "@/src/features/breathing/breathing-exercise-editor-screen";

export default function BreathingExerciseEditorRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <BreathingExerciseEditorScreen exerciseId={id ?? null} />;
}
