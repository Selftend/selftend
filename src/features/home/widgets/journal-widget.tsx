import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useJournalEntries } from "@/src/features/journal/queries";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

export function JournalWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: entries } = useJournalEntries(userId);

  const { selectedDate: todayKey } = useSelectedDate();
  const todayEntries = entries?.filter((e) => toLocalDateKey(e.createdAt) === todayKey) ?? [];
  const latest = todayEntries.at(-1) ?? entries?.at(0) ?? null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="size-8 items-center justify-center rounded-lg bg-ink/10">
              <Icon name="edit-note" className="size-5 text-ink" />
            </View>
            <Text className="text-sm font-semibold">{t("plan.wizard.toolJournal")}</Text>
          </View>
          {todayEntries.length > 0 ? (
            <View className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-primary">
                {t("today.dashboard.countToday", { count: todayEntries.length })}
              </Text>
            </View>
          ) : null}
        </View>

        {latest ? (
          <View className="gap-0.5">
            {latest.title ? (
              <Text className="text-xs font-medium" numberOfLines={1}>
                {latest.title}
              </Text>
            ) : null}
            <Text variant="muted" className="text-xs" numberOfLines={2}>
              {latest.body}
            </Text>
          </View>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("today.dashboard.journalHint")}
          </Text>
        )}

        <View className="flex-row items-center justify-between">
          <Button size="sm" variant="outline" onPress={() => router.push("/tools/journal/new")}>
            <Icon name="edit" className="size-4" />
            <Text>{t("today.dashboard.write")}</Text>
          </Button>
          <Button size="sm" variant="ghost" onPress={() => router.push("/tools/journal")}>
            <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
