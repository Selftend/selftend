import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { TwoStatBody } from "@/src/features/home/widgets/two-stat-body";
import { formatHours } from "@/src/features/sleep/format";
import { useSleepLogs } from "@/src/features/sleep/queries";
import {
  averageDurationMinutes,
  averageQuality,
  loggedOnDate,
} from "@/src/features/sleep/summaries";
import { useSelectedDate } from "@/src/stores/selected-date-store";

export function SleepWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: logs } = useSleepLogs(userId, 30);

  const { selectedDate: todayKey } = useSelectedDate();
  const all = logs ?? [];
  const avgDuration = averageDurationMinutes(all, 7);
  const avgQuality = averageQuality(all, 7);
  const loggedToday = loggedOnDate(all, todayKey);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="size-8 items-center justify-center rounded-lg bg-ink/10">
              <Icon name="bedtime" className="size-5 text-ink" />
            </View>
            <Text className="text-sm font-semibold">{t("home.widgets.sleepLatest.title")}</Text>
          </View>
          {loggedToday ? (
            <View className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-primary">
                {t("home.widgets.sleepLatest.loggedBadge")}
              </Text>
            </View>
          ) : null}
        </View>

        <TwoStatBody
          stats={[
            {
              value: formatHours(avgDuration),
              label: t("home.widgets.sleepLatest.sevenNightAvgLabel"),
            },
            {
              value: avgQuality !== null ? avgQuality.toFixed(1) : "–",
              label: t("home.widgets.sleepLatest.qualityLabel"),
            },
          ]}
        />

        <View className="flex-row items-center justify-between">
          <Button size="sm" variant="outline" onPress={() => router.push("/tools/sleep/new")}>
            <Icon name="bedtime" className="size-4" />
            <Text>{t("home.widgets.sleepLatest.logCta")}</Text>
          </Button>
          <Button size="sm" variant="ghost" onPress={() => router.push("/tools/sleep")}>
            <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
