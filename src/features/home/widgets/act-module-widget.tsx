import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import {
  useCommittedActions,
  useConnectionLogs,
  useDefusionLogs,
} from "@/src/features/act/queries";

export function ActModuleWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: committedActions } = useCommittedActions(userId);
  const { data: defusionLogs } = useDefusionLogs(userId, 10);
  const { data: connectionLogs } = useConnectionLogs(userId, 10);

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const activeActions = committedActions?.filter((a) => a.status === "active") ?? [];
  const recentDefusion =
    defusionLogs?.filter((l) => new Date(l.createdAt) >= weekStart).length ?? 0;
  const recentConnection =
    connectionLogs?.filter((l) => new Date(l.createdAt) >= weekStart).length ?? 0;

  const stats = [
    {
      label: t("today.dashboard.actActions"),
      value: activeActions.length > 0 ? String(activeActions.length) : "—",
      done: activeActions.length > 0,
    },
    {
      label: t("today.dashboard.actDefusion"),
      value: recentDefusion > 0 ? String(recentDefusion) : "—",
      done: recentDefusion > 0,
    },
    {
      label: t("today.dashboard.actConnection"),
      value: recentConnection > 0 ? String(recentConnection) : "—",
      done: recentConnection > 0,
    },
  ];

  return (
    <Card className="border-act/30">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-3">
          <View className="size-10 items-center justify-center rounded-xl border border-act/30 bg-act/15">
            <Text className="text-sm font-bold tracking-wider text-act">ACT</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold">{t("today.modules.actName")}</Text>
            <Text variant="muted" className="text-xs">
              {t("today.dashboard.actModuleSubtitle")}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          {stats.map((stat) => (
            <View
              key={stat.label}
              className={cn(
                "flex-1 gap-0.5 rounded-lg border px-2 py-2",
                stat.done ? "border-act/30 bg-act/5" : "border-border bg-background",
              )}
            >
              <Text
                className="text-[10px] uppercase tracking-wider text-muted-foreground"
                numberOfLines={1}
              >
                {stat.label}
              </Text>
              <Text className={cn("text-base font-semibold", stat.done && "text-act")}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row items-center justify-between">
          <Button size="sm" variant="outline" onPress={() => router.push("/modules/act")}>
            <Icon name="explore" className="size-4" />
            <Text>{t("today.dashboard.actExercise")}</Text>
          </Button>
          <Button size="sm" variant="ghost" onPress={() => router.push("/modules/act")}>
            <Text className="text-muted-foreground">{t("today.dashboard.openAct")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
