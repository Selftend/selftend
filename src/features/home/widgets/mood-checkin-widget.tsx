import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { MoodScale } from "@/src/components/app/mood-scale";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useSelectedDate } from "@/src/stores/selected-date-store";

export function MoodCheckinWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { selectedDate: todayKey } = useSelectedDate();
  const { data: moodLogs } = useMoodLogs(userId, 30);

  const todayLogs = (moodLogs ?? []).filter((l) => l.loggedAt.startsWith(todayKey));
  const moodToday = todayLogs.length > 0 ? todayLogs[todayLogs.length - 1].moodScore : null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-be/10">
            <Icon name="mood" className="size-5 text-be" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.moodCheckin.title")}</Text>
        </View>
        <MoodScale
          value={moodToday}
          onChange={(score) => router.push(`/tools/mood-tracker/new?score=${score}`)}
        />
      </CardContent>
    </Card>
  );
}
