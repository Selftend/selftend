import { useLocalSearchParams } from "expo-router";

import NotFoundScreen from "@/src/components/app/not-found-screen";
import { HabitsLearnDetailScreen } from "@/src/features/habits/habits-learn-screen";

export default function HabitsLearnDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  // Not `null`: a slug naming no article used to render a blank screen with
  // nothing on it to press (#1328).
  if (typeof slug !== "string" || !slug) return <NotFoundScreen />;
  return <HabitsLearnDetailScreen slug={slug} />;
}
