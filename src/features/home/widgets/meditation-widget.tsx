import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useMeditationSessions } from "@/src/features/meditation/queries";

export function MeditationWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: sessions } = useMeditationSessions(userId);

  const todayKey = new Date().toISOString().slice(0, 10);
  const doneToday = sessions?.some((s) => s.completedAt.startsWith(todayKey)) ?? false;

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekSessions = sessions?.filter((s) => new Date(s.completedAt) >= weekStart) ?? [];
  const totalMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const lastSession = sessions?.at(0);

  return (
    <Card>
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="size-8 items-center justify-center rounded-lg bg-be/10">
              <Icon name="self-improvement" className="size-5 text-be" />
            </View>
            <Text className="text-sm font-semibold">{t("plan.wizard.toolMeditation")}</Text>
          </View>
          {doneToday ? (
            <View className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-primary">
                {t("today.dashboard.doneToday")}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 gap-0.5 rounded-lg border border-border bg-background px-3 py-2">
            <Text className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("today.dashboard.thisWeek")}
            </Text>
            <Text className="text-lg font-semibold">
              {weekSessions.length > 0
                ? t("today.dashboard.meditationWeekCount", { count: weekSessions.length })
                : "—"}
            </Text>
          </View>
          <View className="flex-1 gap-0.5 rounded-lg border border-border bg-background px-3 py-2">
            <Text className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("today.dashboard.minutesThisWeek")}
            </Text>
            <Text className="text-lg font-semibold">
              {totalMinutes > 0 ? String(totalMinutes) : "—"}
            </Text>
          </View>
        </View>

        {lastSession ? (
          <Text variant="muted" className="text-xs">
            {t("today.dashboard.meditationStage", { stage: lastSession.stageAtSession })}
          </Text>
        ) : null}

        <View className="flex-row items-center justify-between">
          <Button size="sm" variant="outline" onPress={() => router.push("/tools/meditation")}>
            <Icon name="self-improvement" className="size-4" />
            <Text>{t("today.dashboard.startSession")}</Text>
          </Button>
          <Button size="sm" variant="ghost" onPress={() => router.push("/tools/meditation")}>
            <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
