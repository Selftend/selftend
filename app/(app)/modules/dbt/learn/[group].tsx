import { useLocalSearchParams } from "expo-router";

import NotFoundScreen from "@/src/components/app/not-found-screen";
import { DBT_GROUP_BY_SLUG } from "@/src/features/dbt/dbt-home-config";
import DbtLearnGroupScreen from "@/src/features/dbt/dbt-learn-group-screen";

export default function DbtLearnGroupRoute() {
  const { group } = useLocalSearchParams<{ group: string }>();
  const groupKey = typeof group === "string" ? DBT_GROUP_BY_SLUG[group] : undefined;
  // Not `null`: a slug naming no group would otherwise render a blank screen
  // with nothing on it to press - the shape #1328 ruled against.
  if (!groupKey) return <NotFoundScreen />;
  return <DbtLearnGroupScreen groupKey={groupKey} />;
}
