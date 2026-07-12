import { Fragment } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import type { ChallengePlan } from "@/src/features/recovery/types";

interface ChallengePlanListProps {
  plans: ChallengePlan[];
  onEdit: (plan: ChallengePlan) => void;
  onDelete: (challengePlanId: string) => void;
  isDeleting: boolean;
}

/** Read-only list of saved challenge plans with edit/remove actions. */
export function ChallengePlanList({ plans, onEdit, onDelete, isDeleting }: ChallengePlanListProps) {
  const { t } = useTranslation("cbt");

  return (
    <Fragment>
      {plans.map((plan) => (
        <View key={plan.id} className="gap-3 rounded-md border border-border p-4">
          <View className="gap-1">
            <Text className="font-medium">{plan.challengeDescription}</Text>
            <Text variant="muted">{plan.copingSteps.join(" · ")}</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Button onPress={() => onEdit(plan)} size="sm" variant="outline">
              <Text>{t("recovery.editChallenge")}</Text>
            </Button>
            <Button
              disabled={isDeleting}
              onPress={() => void onDelete(plan.id)}
              size="sm"
              variant="ghost"
            >
              <Text>{t("recovery.removeChallenge")}</Text>
            </Button>
          </View>
        </View>
      ))}
    </Fragment>
  );
}
