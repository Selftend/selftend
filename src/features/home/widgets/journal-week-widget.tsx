import { router } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useJournalEntries } from "@/src/features/journal/queries";
import { countWords } from "@/src/features/journal/word-count";
import { TwoStatBody } from "@/src/features/home/widgets/two-stat-body";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";
import { parseLocalNoon } from "@/src/utils/date";

export function JournalWeekWidget({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation("navigation");
  const { data: entries } = useJournalEntries(userId);
  const { selectedDate, isToday } = useSelectedDate();

  const all = entries ?? [];
  // Memoize the per-body word count (up to ~50 full journal bodies) so it isn't recomputed
  // on every Home re-render / DateBar tap; pure function of `entries`.
  const totalWords = useMemo(
    () => all.reduce((sum, e) => sum + countWords(e.body), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries],
  );
  const dayCount = useMemo(
    () => all.filter((e) => toLocalDateKey(e.createdAt) === selectedDate).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, selectedDate],
  );

  const dayBadge =
    dayCount > 0
      ? isToday
        ? t("today.dashboard.countToday", { count: dayCount })
        : t("home.widgets.journalWeek.countOnDay", {
            count: dayCount,
            date: new Intl.DateTimeFormat(i18n.language, {
              month: "short",
              day: "numeric",
            }).format(parseLocalNoon(selectedDate)),
          })
      : null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="size-8 items-center justify-center rounded-lg bg-ink/10">
              <Icon name="edit-note" className="size-5 text-ink" />
            </View>
            <Text className="text-sm font-semibold">{t("home.widgets.journalWeek.title")}</Text>
          </View>
          {dayBadge ? (
            <View className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-primary">{dayBadge}</Text>
            </View>
          ) : null}
        </View>

        <TwoStatBody
          stats={[
            { value: all.length, label: t("home.widgets.journalWeek.entriesLabel") },
            { value: totalWords, label: t("home.widgets.journalWeek.wordsLabel") },
          ]}
        />

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
