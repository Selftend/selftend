import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, SectionList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { EmptyState, ErrorState } from "@/src/components/app/screen-state";
import { Text } from "@/src/components/react-native-reusables/text";
import { JournalCard } from "@/src/features/journal/journal-card";
import {
  formatJournalMonth,
  formatJournalRecentWhen,
  groupJournalHistoryEntries,
  type JournalRecentSection,
} from "@/src/features/journal/journal-overview";
import { useJournalEntryPages } from "@/src/features/journal/queries";
import type { JournalEntry } from "@/src/features/journal/types";
import { FORM_COLUMN_WIDTH } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";

/** Every journal entry, paged to exhaustion and grouped without partial totals. */
export default function JournalHistoryScreen() {
  const { t, i18n } = useTranslation("journal");
  const roomStyle = useRoomStyle("ink");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useJournalEntryPages(userId);

  const sections = useMemo(() => groupJournalHistoryEntries(data?.pages.flat()), [data]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  const openEntry = useCallback((id: string) => router.push(`/tools/journal/${id}`), []);

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["bottom", "left", "right"]}
      style={roomStyle}
    >
      <SectionList<JournalEntry, JournalRecentSection>
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          flexGrow: 1,
          padding: 16,
          width: "100%",
          maxWidth: FORM_COLUMN_WIDTH,
          alignSelf: "center",
        }}
        stickySectionHeadersEnabled={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-2 gap-2">
            <ScreenHeader title={t("history.title")} />
            <Text variant="muted">{t("history.description")}</Text>
          </View>
        }
        ListEmptyComponent={
          isPending ? null : isError ? (
            <ErrorState
              icon="cloud-off"
              title={t("history.error.title")}
              description={t("history.error.description")}
              action={{ label: t("errors:fallback.retry"), onPress: () => void refetch() }}
            />
          ) : (
            <EmptyState
              icon="edit-note"
              title={t("list.empty.title")}
              description={t("history.empty")}
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator />
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <View className="mb-0.5 mt-5 flex-row items-center gap-3">
            <Text className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {section.kind === "month"
                ? formatJournalMonth(section.monthKey!, i18n.language)
                : t(`groups.${section.kind}`)}
            </Text>
            <View className="h-px flex-1 bg-border" />
          </View>
        )}
        renderItem={({ item, section }) => (
          <JournalCard
            entry={item}
            when={formatJournalRecentWhen(item, section.kind, i18n.language)}
            onOpen={openEntry}
          />
        )}
      />
    </SafeAreaView>
  );
}
