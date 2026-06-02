import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useMoodLogs } from "@/src/features/mood/queries";
import { startOfDayDaysAgo } from "@/src/utils/date";
import { roundTo1 } from "@/src/utils/number";

function computeAverage(logs: { loggedAt: string; moodScore: number }[], days: number) {
  const cutoff = startOfDayDaysAgo(days);
  const scores = logs.filter((l) => new Date(l.loggedAt) >= cutoff).map((l) => l.moodScore);
  if (scores.length === 0) return null;
  return roundTo1(scores.reduce((s, v) => s + v, 0) / scores.length);
}

export function MoodTrendWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: moodLogs } = useMoodLogs(userId, 30);
  const logs = moodLogs ?? [];
  const sevenDay = computeAverage(logs, 7);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-be/10">
            <Icon name="show-chart" className="size-5 text-be" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.moodTrend.title")}</Text>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1 gap-0.5 rounded-xl bg-muted/40 px-3 py-2.5">
            <Text className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("today.moodSnapshot.sevenDay")}
            </Text>
            <Text
              className={cn("text-2xl font-bold", sevenDay === null && "text-muted-foreground")}
            >
              {sevenDay === null ? "–" : sevenDay.toFixed(1)}
            </Text>
          </View>
          <View className="flex-1 gap-0.5 rounded-xl bg-muted/40 px-3 py-2.5">
            <Text className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("today.moodSnapshot.entries")}
            </Text>
            <Text className="text-2xl font-bold">{String(logs.length)}</Text>
          </View>
        </View>
        <Button
          size="sm"
          variant="ghost"
          className="self-end"
          onPress={() => router.push("/tools/mood-tracker")}
        >
          <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}
