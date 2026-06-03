import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { TwoStatBody } from "@/src/features/home/widgets/two-stat-body";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

export function MeditationWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: sessions } = useMeditationSessions(userId);

  const { selectedDate: todayKey } = useSelectedDate();
  const all = sessions ?? [];
  const doneToday = all.some((s) => toLocalDateKey(s.completedAt) === todayKey);
  const totalMinutes = all.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="size-8 items-center justify-center rounded-lg bg-iris/10">
              <Icon name="self-improvement" className="size-5 text-iris" />
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

        <TwoStatBody
          stats={[
            { value: all.length, label: t("home.widgets.meditationPick.sessionsLabel") },
            { value: totalMinutes, label: t("home.widgets.meditationPick.minutesLabel") },
          ]}
        />

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
