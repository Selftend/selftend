import { useLocalSearchParams } from "expo-router";

import { HabitDetailScreen } from "@/src/features/habits/habit-detail-screen";

export default function HabitDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (typeof id !== "string" || !id) return null;
  return <HabitDetailScreen habitId={id} />;
}
