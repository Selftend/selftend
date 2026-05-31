import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { MoodEntryCard } from "@/src/features/mood/mood-entry-card";
import { groupLogsByDate } from "@/src/features/mood/summaries";
import type { MoodLog } from "@/src/features/mood/types";

export function MoodHistoryList({ logs }: { logs: MoodLog[] }) {
  const { t } = useTranslation("mood");
  const groups = groupLogsByDate(logs);

  if (groups.length === 0) {
    return <Text variant="muted">{t("history.empty")}</Text>;
  }

  return (
    <View className="gap-5">
      {groups.map((group) => (
        <View key={group.key} className="gap-3">
          <View className="flex-row items-center gap-3">
            <Text className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {t(`history.groups.${group.key}`)}
            </Text>
            <View className="h-px flex-1 bg-border" />
            <Text variant="muted" className="text-[12px]">
              {t("history.groupAverage", { average: group.average.toFixed(1) })}
            </Text>
          </View>
          <View className="gap-3">
            {group.entries.map((entry) => (
              <MoodEntryCard key={entry.id} entry={entry} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
