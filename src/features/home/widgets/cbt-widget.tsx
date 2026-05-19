import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useThoughtRecords } from "@/src/features/cbt/queries";

export function CbtWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: records } = useThoughtRecords(userId);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = records?.filter((r) => r.createdAt.startsWith(todayKey)).length ?? 0;
  const incomplete = records?.find((r) => !r.balancedThought?.trim()) ?? null;

  return (
    <Card>
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
              <Icon name="article" className="size-5 text-primary" />
            </View>
            <Text className="text-sm font-semibold">{t("plan.wizard.toolCbt")}</Text>
          </View>
          {todayCount > 0 ? (
            <View className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-primary">
                {t("today.dashboard.countToday", { count: todayCount })}
              </Text>
            </View>
          ) : null}
        </View>

        {incomplete ? (
          <View className="flex-row items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
            <Text className="flex-1 text-xs text-muted-foreground" numberOfLines={2}>
              {incomplete.automaticThought}
            </Text>
            <Button
              size="sm"
              variant="outline"
              onPress={() =>
                router.push(
                  `/modules/cbt/history/${incomplete.id}` as Parameters<typeof router.push>[0],
                )
              }
            >
              <Text>{t("today.plan.resume")}</Text>
            </Button>
          </View>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("today.dashboard.cbtHint")}
          </Text>
        )}

        <View className="flex-row items-center justify-between">
          <Button size="sm" variant="outline" onPress={() => router.push("/modules/cbt/new")}>
            <Icon name="add" className="size-4" />
            <Text>{t("today.dashboard.newRecord")}</Text>
          </Button>
          <Button size="sm" variant="ghost" onPress={() => router.push("/modules/cbt")}>
            <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
