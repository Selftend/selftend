import { useMemo, type ReactElement } from "react";
import { SectionList, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { MoodEntryCard } from "@/src/features/mood/mood-entry-card";
import { groupLogsByDate } from "@/src/features/mood/summaries";
import { useEmotionDisplay } from "@/src/features/mood/use-emotion-display";
import type { MoodLog } from "@/src/features/mood/types";

interface MoodHistoryListProps {
  logs: MoodLog[];
  // Rendered above the first section. The screen passes its whole top half here so the
  // SectionList can be the scroll root (a SectionList nested in a ScrollView can't
  // virtualize). Off-screen rows are now recycled instead of all mounting at once.
  ListHeaderComponent?: ReactElement;
}

export function MoodHistoryList({ logs, ListHeaderComponent }: MoodHistoryListProps) {
  const { t } = useTranslation("mood");
  // One emotion-preferences query + one lookup map for the whole list (was one per card).
  const { resolveEmotion } = useEmotionDisplay();

  const sections = useMemo(
    () =>
      groupLogsByDate(logs).map((group) => ({
        key: group.key,
        average: group.average,
        data: group.entries,
      })),
    [logs],
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={<Text variant="muted">{t("history.empty")}</Text>}
      // SectionList is NOT cssInterop-registered by NativeWind (only ScrollView,
      // FlatList, and VirtualizedList are), so `contentContainerClassName` is
      // silently dropped and the screen loses its padding. Style the content
      // container directly instead - flexGrow 1 + 16px padding (`p-4`) to match
      // the other tool landings (e.g. journal's `grow gap-6 p-4`).
      contentContainerStyle={{ flexGrow: 1, padding: 16 }}
      stickySectionHeadersEnabled={false}
      ItemSeparatorComponent={() => <View className="h-3" />}
      renderSectionHeader={({ section }) => (
        <View className="mb-3 mt-5 flex-row items-center gap-3">
          <Text className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {t(`history.groups.${section.key}`)}
          </Text>
          <View className="h-px flex-1 bg-border" />
          <Text variant="muted" className="text-[12px]">
            {t("history.groupAverage", { average: section.average.toFixed(1) })}
          </Text>
        </View>
      )}
      renderItem={({ item }) => <MoodEntryCard entry={item} resolveEmotion={resolveEmotion} />}
    />
  );
}
