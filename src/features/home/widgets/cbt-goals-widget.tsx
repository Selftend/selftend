import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useGoals } from "@/src/features/goals/queries";

export function CbtGoalsWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data } = useGoals(userId);
  const active = (data ?? [])
    .filter((g) => g.status === "active")
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const top = active[0] ?? null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="gps-fixed" className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.cbtGoals.title")}</Text>
        </View>
        {top ? (
          <>
            <Text variant="muted" className="text-xs">
              {t("home.widgets.cbtGoals.stat", { count: active.length })}
            </Text>
            <Text className="text-xs" numberOfLines={2}>
              {top.title}
            </Text>
          </>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.cbtGoals.empty")}
          </Text>
        )}
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onPress={() =>
            router.push(top ? `/modules/cbt/goals/${top.id}` : "/modules/cbt/goals/new")
          }
        >
          <Text>{top ? t("home.widgets.cbtGoals.open") : t("home.widgets.cbtGoals.set")}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
