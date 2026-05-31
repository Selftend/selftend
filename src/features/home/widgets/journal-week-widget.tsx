import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useJournalEntries } from "@/src/features/journal/queries";
import { countWords } from "@/src/features/journal/word-count";
import { TwoStatBody } from "@/src/features/home/widgets/two-stat-body";

export function JournalWeekWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: entries } = useJournalEntries(userId);

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekEntries = (entries ?? []).filter((e) => new Date(e.createdAt).getTime() >= cutoff);
  const words = weekEntries.reduce((sum, e) => sum + countWords(e.body), 0);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-ink/10">
            <Icon name="date-range" className="size-5 text-ink" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.journalWeek.title")}</Text>
        </View>
        {weekEntries.length > 0 ? (
          <TwoStatBody
            stats={[
              { value: weekEntries.length, label: t("home.widgets.journalWeek.entriesLabel") },
              { value: words, label: t("home.widgets.journalWeek.wordsLabel") },
            ]}
          />
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.journalWeek.empty")}
          </Text>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="self-end"
          onPress={() => router.push("/tools/journal")}
        >
          <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}
