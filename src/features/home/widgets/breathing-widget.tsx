import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useBreathingSessions } from "@/src/features/breathing/queries";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { useLocaleFormats } from "@/src/lib/locale-format";

export function BreathingWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { formatDate } = useLocaleFormats();
  const { data: sessions } = useBreathingSessions(userId);

  const { selectedDate: todayKey } = useSelectedDate();
  // `dayKey` is the civil day the session was finished on - compare, never re-bucket,
  // so a session logged before flying east stays on the day it happened (#330).
  const todaySessions = sessions?.filter((s) => s.dayKey === todayKey) ?? [];
  const doneToday = todaySessions.length > 0;
  const lastSession = sessions?.at(0);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="size-8 items-center justify-center rounded-lg bg-muted">
              <Icon name="air" className="size-5 text-muted-foreground" />
            </View>
            <Text className="text-sm font-semibold">{t("plan.wizard.toolBreathing")}</Text>
          </View>
          {doneToday ? (
            <View className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-primary">
                {t("today.dashboard.doneToday")}
              </Text>
            </View>
          ) : null}
        </View>

        <Text variant="muted" className="text-xs">
          {lastSession
            ? t("today.dashboard.lastSession", {
                date: formatDate(lastSession.completedAt),
              })
            : t("today.dashboard.breathingHint")}
        </Text>

        <View className="flex-row items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            onPress={() => router.push("/tools/breathing/session")}
          >
            <Icon name="air" className="size-4" />
            <Text>{t("today.dashboard.startBreathing")}</Text>
          </Button>
          <Button size="sm" variant="ghost" onPress={() => router.push("/tools/breathing")}>
            <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
