import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useActivities } from "@/src/features/activities/queries";
import { useSelfCareLog } from "@/src/features/self-care/queries";

export function CbtModuleWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const todayKey = new Date().toISOString().slice(0, 10);

  const { data: records } = useThoughtRecords(userId);
  const { data: activities } = useActivities(userId);
  const { data: selfCareLog } = useSelfCareLog(userId, todayKey);

  const recordsToday = records?.filter((r) => r.createdAt.startsWith(todayKey)).length ?? 0;
  const scheduledToday = activities?.filter((a) => a.scheduledAt?.startsWith(todayKey)) ?? [];
  const completedActivities = scheduledToday.filter((a) => a.completedAt !== null).length;
  const selfCareDone = Boolean(selfCareLog);

  const stats = [
    {
      label: t("today.dashboard.cbtModuleRecords"),
      value: String(recordsToday),
      done: recordsToday > 0,
    },
    {
      label: t("today.dashboard.cbtModuleActivities"),
      value: scheduledToday.length > 0 ? `${completedActivities}/${scheduledToday.length}` : "-",
      done: scheduledToday.length > 0 && completedActivities === scheduledToday.length,
    },
    {
      label: t("today.dashboard.cbtModuleSelfCare"),
      value: selfCareDone ? t("today.dashboard.done") : "-",
      done: selfCareDone,
    },
  ];

  return (
    <Card className="border-primary/30">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-3">
          <View className="size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15">
            <Text className="text-sm font-bold tracking-wider text-primary">CBT</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold">{t("today.modules.cbtName")}</Text>
            <Text variant="muted" className="text-xs">
              {t("today.dashboard.cbtModuleSubtitle")}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          {stats.map((stat) => (
            <View
              key={stat.label}
              className={cn(
                "flex-1 gap-0.5 rounded-lg border px-2 py-2",
                stat.done ? "border-primary/30 bg-primary/5" : "border-border bg-background",
              )}
            >
              <Text
                className="text-[10px] uppercase tracking-wider text-muted-foreground"
                numberOfLines={1}
              >
                {stat.label}
              </Text>
              <Text className={cn("text-base font-semibold", stat.done && "text-primary")}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row items-center justify-between">
          <Button size="sm" variant="outline" onPress={() => router.push("/modules/cbt/new")}>
            <Icon name="add" className="size-4" />
            <Text>{t("today.dashboard.newRecord")}</Text>
          </Button>
          <Button size="sm" variant="ghost" onPress={() => router.push("/modules/cbt")}>
            <Text className="text-muted-foreground">{t("today.dashboard.openCbt")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
