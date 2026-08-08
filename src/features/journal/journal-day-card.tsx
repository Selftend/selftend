import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { JournalCard } from "@/src/features/journal/journal-card";
import { countWords } from "@/src/features/journal/word-count";
import type { JournalEntry } from "@/src/features/journal/types";
import { currentDateKey, parseLocalNoon } from "@/src/utils/date";

interface JournalDayCardProps {
  entries: JournalEntry[];
  selectedDate: string;
}

export function JournalDayCard({ entries, selectedDate }: JournalDayCardProps) {
  const { t, i18n } = useTranslation("journal");

  const dayEntries = useMemo(
    () => entries.filter((e) => e.dayKey === selectedDate),
    [entries, selectedDate],
  );
  const dayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(parseLocalNoon(selectedDate)),
    [i18n.language, selectedDate],
  );
  const words = dayEntries.reduce((sum, e) => sum + countWords(e.body), 0);
  // Asked of the date this card was handed, not read from a hook that answered
  // with a literal `true` (#720). Today it is always the current day, because
  // nothing renders this card for another one yet - but the question is honest,
  // and the answer starts varying the moment something does.
  const isToday = selectedDate === currentDateKey();
  const title = isToday ? t("day.today") : dayLabel;
  // Stable callback so memoized JournalCards aren't re-rendered by a parent re-render.
  const openEntry = useCallback((id: string) => router.push(`/tools/journal/${id}`), []);

  return (
    <Card variant="soft">
      <CardContent className="gap-3">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className="text-base font-semibold">{title}</Text>
          {dayEntries.length > 0 ? (
            <Text variant="muted" className="text-xs">
              {`${t("hero.entries", { count: dayEntries.length })} · ${t("hero.words", {
                count: words,
              })}`}
            </Text>
          ) : null}
        </View>

        {dayEntries.length > 0 ? (
          <View className="gap-3">
            {dayEntries.map((entry) => (
              <JournalCard key={entry.id} entry={entry} onOpen={openEntry} />
            ))}
          </View>
        ) : (
          <View className="gap-3">
            <Text variant="muted" className="text-sm">
              {t("day.empty", { date: isToday ? t("day.today").toLowerCase() : dayLabel })}
            </Text>
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              onPress={() => router.push("/tools/journal/new")}
            >
              <Icon name="edit" className="size-4" />
              <Text>{t("day.writeOne")}</Text>
            </Button>
          </View>
        )}
      </CardContent>
    </Card>
  );
}
