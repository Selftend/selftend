import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { answeredCount } from "@/src/features/gratitude/questions";
import { TwoStatBody } from "@/src/features/home/widgets/two-stat-body";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

export function GratitudeWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: entries } = useGratitudeEntries(userId, 500);

  const { selectedDate: todayKey } = useSelectedDate();
  const all = entries ?? [];
  const todayEntries = all.filter((e) => toLocalDateKey(e.loggedAt) === todayKey);
  const totalItems = all.reduce((sum, e) => sum + answeredCount(e.items), 0);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="size-8 items-center justify-center rounded-lg bg-think/10">
              <Icon name="favorite" className="size-5 text-think" />
            </View>
            <Text className="text-sm font-semibold">{t("plan.wizard.toolGratitude")}</Text>
          </View>
          {todayEntries.length > 0 ? (
            <View className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-primary">
                {t("today.dashboard.countToday", { count: todayEntries.length })}
              </Text>
            </View>
          ) : null}
        </View>

        <TwoStatBody
          stats={[
            { value: all.length, label: t("home.widgets.gratitudeLatest.entriesLabel") },
            { value: totalItems, label: t("home.widgets.gratitudeLatest.itemsLabel") },
          ]}
        />

        <View className="flex-row items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            onPress={() => router.push("/tools/gratitude-log/new")}
          >
            <Icon name="add" className="size-4" />
            <Text>{t("today.dashboard.addEntry")}</Text>
          </Button>
          <Button size="sm" variant="ghost" onPress={() => router.push("/tools/gratitude-log")}>
            <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
