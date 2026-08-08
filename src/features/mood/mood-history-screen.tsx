import { useCallback, useMemo } from "react";
import { ActivityIndicator, SectionList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { EmptyState, ErrorState } from "@/src/components/app/screen-state";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  formatHistoryMonth,
  groupHistorySections,
  type HistorySection,
} from "@/src/features/mood/history-groups";
import { MoodHistoryRow } from "@/src/features/mood/mood-history-row";
import { useMoodHistoryPages } from "@/src/features/mood/queries";
import type { MoodLog } from "@/src/features/mood/types";
import { useEmotionDisplay } from "@/src/features/mood/use-emotion-display";
import { FORM_COLUMN_WIDTH } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";

/**
 * Every check-in the user has, scrollable to the end (#734, decided on #696).
 *
 * The only route to an old entry: the overview's week strip is a recency view
 * and the mood map deliberately never navigates. So this screen carries no cap -
 * it pages until the data runs out, rather than stopping at a silent ceiling and
 * calling itself "all history".
 *
 * No stats, no averages, no total count: a `ScreenHeader` sub-screen has nowhere
 * honest to put a number that only covers the pages already loaded (#705).
 */
export default function MoodHistoryScreen() {
  const { t, i18n } = useTranslation("mood");
  const roomStyle = useRoomStyle("be");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useMoodHistoryPages(userId);
  const { resolveEmotion } = useEmotionDisplay();

  const sections = useMemo(() => groupHistorySections(data?.pages.flat() ?? []), [data]);

  const loadMore = useCallback(() => {
    // `hasNextPage` alone isn't enough: onEndReached fires repeatedly while the
    // user keeps dragging, and each call would queue another page fetch.
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["bottom", "left", "right"]}
      style={roomStyle}
    >
      <SectionList<MoodLog, HistorySection>
        sections={sections}
        keyExtractor={(item) => item.id}
        // The SectionList is the scroll root so rows recycle and onEndReached can
        // drive paging. NativeWind does not cssInterop SectionList, so both the
        // padding and the reading column ride contentContainerStyle - a className
        // is silently dropped, and a centred wrapper would centre only the header.
        contentContainerStyle={{
          flexGrow: 1,
          padding: 16,
          width: "100%",
          maxWidth: FORM_COLUMN_WIDTH,
          alignSelf: "center",
        }}
        stickySectionHeadersEnabled={false}
        // The hairline sits between rows rather than on them, so the first row of
        // a section doesn't draw a second rule 2px under its own header rule.
        ItemSeparatorComponent={() => <View className="h-px bg-border" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-2 gap-2">
            <ScreenHeader title={t("allHistory.title")} />
            <Text variant="muted">{t("allHistory.description")}</Text>
          </View>
        }
        ListEmptyComponent={
          // "Nothing here yet" is a claim about the account, so it may only be
          // made once a page has actually come back empty. While the first page
          // is in flight, and when it failed outright, the honest answer is a
          // different one - either would otherwise tell a returning user their
          // history is gone. A failed background refetch that still has pages
          // cached never reaches here, because the list is not empty.
          isPending ? null : isError ? (
            <ErrorState
              icon="cloud-off"
              title={t("allHistory.error.title")}
              description={t("allHistory.error.description")}
              action={{ label: t("errors:fallback.retry"), onPress: () => void refetch() }}
            />
          ) : (
            <EmptyState
              icon="history"
              title={t("allHistory.empty.title")}
              description={t("allHistory.empty.description")}
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
                ? formatHistoryMonth(section.monthKey!, i18n.language)
                : t(`allHistory.groups.${section.kind}`)}
            </Text>
            <View className="h-px flex-1 bg-border" />
          </View>
        )}
        renderItem={({ item, section }) => (
          <MoodHistoryRow
            entry={item}
            kind={section.kind}
            language={i18n.language}
            resolveEmotion={resolveEmotion}
          />
        )}
      />
    </SafeAreaView>
  );
}
