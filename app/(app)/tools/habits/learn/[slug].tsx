import { useLocalSearchParams } from "expo-router";

import { HabitsLearnDetailScreen } from "@/src/features/habits/habits-learn-screen";

export default function HabitsLearnDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  if (typeof slug !== "string" || !slug) return null;
  return <HabitsLearnDetailScreen slug={slug} />;
}
