import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { CHROME_MARK, CHROME_WASH } from "@/src/lib/theme/chrome";
import { cn } from "@/lib/utils";
import { Text } from "@/src/components/react-native-reusables/text";
import { MoodScale } from "@/src/components/app/mood-scale";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useSelectedDate } from "@/src/stores/selected-date-store";

export function MoodCheckinWidget({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation("navigation");
  const { selectedDate: todayKey } = useSelectedDate();
  const { data: moodLogs } = useMoodLogs(userId, 30);

  const todayLogs = (moodLogs ?? []).filter((l) => l.dayKey === todayKey);
  const moodToday = todayLogs.length > 0 ? todayLogs[0].moodScore : null;
  const lastTime =
    todayLogs.length > 0
      ? new Intl.DateTimeFormat(i18n.language, { hour: "numeric", minute: "2-digit" }).format(
          new Date(todayLogs[0].loggedAt),
        )
      : null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className={cn("size-8 items-center justify-center rounded-lg", CHROME_WASH)}>
            <Icon name="mood" className={cn("size-5", CHROME_MARK)} />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.moodCheckin.title")}</Text>
        </View>
        <MoodScale
          compact
          value={moodToday}
          onChange={(score) => router.push(`/tools/mood-tracker/new?score=${score}`)}
        />
        <Text variant="muted" className="text-[11px]">
          {todayLogs.length === 0
            ? t("home.widgets.moodCheckin.emptyPrompt")
            : `${t("home.widgets.moodCheckin.loggedSummary", { count: todayLogs.length })}${
                lastTime ? ` · ${t("home.widgets.moodCheckin.lastAt", { time: lastTime })}` : ""
              }`}
        </Text>
      </CardContent>
    </Card>
  );
}
