import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import type { Goal } from "@/src/features/goals/types";

interface ActiveGoalsSectionProps {
  goals: Goal[];
}

export function ActiveGoalsSection({ goals }: ActiveGoalsSectionProps) {
  const { t } = useTranslation("cbt");

  if (goals.length === 0) {
    return null;
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="h3">{t("dashboard.activeGoals")}</Text>
        <Button onPress={() => router.push("/modules/cbt/goals")} size="sm" variant="ghost">
          <Text>{t("dashboard.seeAll")}</Text>
        </Button>
      </View>
      {goals.map((goal) => (
        <AccessibleCardLink
          key={goal.id}
          title={goal.title}
          description={t(`goals.domain.${goal.lifeDomain}`)}
          onPress={() => router.push(`/modules/cbt/goals/${goal.id}`)}
        />
      ))}
    </View>
  );
}
