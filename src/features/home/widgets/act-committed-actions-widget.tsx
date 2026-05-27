import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useAllActionSteps, useCommittedActions } from "@/src/features/act/queries";

export function ActCommittedActionsWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: actions } = useCommittedActions(userId, "active");
  const { data: steps } = useAllActionSteps(userId);

  const active = [...(actions ?? [])]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 2);
  const allSteps = steps ?? [];
  const hasActions = active.length > 0;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-act/10">
            <Icon name="checklist" className="size-5 text-act" />
          </View>
          <Text className="text-sm font-semibold">
            {t("home.widgets.actCommittedActions.title")}
          </Text>
        </View>
        {hasActions ? (
          <View className="gap-2">
            {active.map((a) => {
              const total = allSteps.filter((s) => s.actionId === a.id).length;
              const done = allSteps.filter((s) => s.actionId === a.id && s.isCompleted).length;
              return (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/modules/act/committed-action/${a.id}`)}
                  className="gap-0.5 rounded-lg border border-border bg-card p-2 active:bg-accent/40"
                >
                  <Text className="text-xs font-medium" numberOfLines={1}>
                    {a.title}
                  </Text>
                  {total > 0 ? (
                    <Text variant="muted" className="text-[11px]">
                      {t("home.widgets.actCommittedActions.steps", { done, total })}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.actCommittedActions.empty")}
          </Text>
        )}
        {hasActions ? (
          <Button
            size="sm"
            variant="ghost"
            className="self-end"
            onPress={() => router.push("/modules/act/committed-action")}
          >
            <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="self-start"
            onPress={() => router.push("/modules/act/committed-action/new")}
          >
            <Text>{t("home.widgets.actCommittedActions.setAction")}</Text>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
