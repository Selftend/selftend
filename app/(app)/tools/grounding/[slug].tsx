import { useLocalSearchParams } from "expo-router";

import { GroundingFlow } from "@/src/features/grounding/grounding-flow";

export default function GroundingExerciseScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <GroundingFlow slug={slug} />;
}
