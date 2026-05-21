import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useMoodLogs } from "@/src/features/mood/queries";

function computeAverage(logs: { loggedAt: string; moodScore: number }[], days: number) {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const scores = logs.filter((l) => new Date(l.loggedAt) >= cutoff).map((l) => l.moodScore);
  if (scores.length === 0) return { average: null as number | null, count: 0 };
  return {
    average: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10,
    count: scores.length,
  };
}

export function MoodWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: moodLogs } = useMoodLogs(userId, 30);

  const todayKey = new Date().toISOString().slice(0, 10);
  const logs = moodLogs ?? [];
  const sevenDay = computeAverage(logs, 7);
  const todayLogs = logs.filter((l) => l.loggedAt.startsWith(todayKey));
  const moodToday = todayLogs.length > 0 ? todayLogs[todayLogs.length - 1].moodScore : null;

  return (
    <Card>
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="size-8 items-center justify-center rounded-lg bg-be/10">
              <Icon name="mood" className="size-5 text-be" />
            </View>
            <Text className="text-sm font-semibold">{t("plan.wizard.toolMood")}</Text>
          </View>
          {moodToday !== null ? (
            <View className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-primary">
                {t("today.dashboard.todayScore", { score: moodToday })}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 gap-0.5 rounded-lg border border-border bg-background px-3 py-2">
            <Text className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("today.moodSnapshot.sevenDay")}
            </Text>
            <Text
              className={cn(
                "text-xl font-semibold",
                sevenDay.average === null && "text-muted-foreground",
              )}
            >
              {sevenDay.average === null ? "-" : sevenDay.average.toFixed(1)}
            </Text>
          </View>
          <View className="flex-1 gap-0.5 rounded-lg border border-border bg-background px-3 py-2">
            <Text className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("today.moodSnapshot.today")}
            </Text>
            <Text
              className={cn("text-xl font-semibold", moodToday === null && "text-muted-foreground")}
            >
              {moodToday !== null ? String(moodToday) : "-"}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            onPress={() => router.push("/tools/mood-tracker/new")}
          >
            <Icon name="add" className="size-4" />
            <Text>{t("today.moodSnapshot.logMood")}</Text>
          </Button>
          <Button size="sm" variant="ghost" onPress={() => router.push("/tools/mood-tracker")}>
            <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
