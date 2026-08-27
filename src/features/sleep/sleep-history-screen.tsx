import { useCallback, useMemo } from "react";
import { ActivityIndicator, SectionList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { EmptyState, ErrorState } from "@/src/components/app/screen-state";
import { Text } from "@/src/components/react-native-reusables/text";
import { SleepEntryRow } from "@/src/features/sleep/sleep-entry-row";
import { useSleepHistoryPages } from "@/src/features/sleep/queries";
import type { SleepLog } from "@/src/features/sleep/types";
import {
  formatHistoryMonth,
  formatHistoryWhen,
  groupHistorySections,
  type HistorySection,
  type HistorySectionKind,
} from "@/src/lib/history-groups";
import { FORM_COLUMN_WIDTH } from "@/src/lib/layout";
import { useSession } from "@/src/providers/session-provider";
import { parseLocalNoon } from "@/src/utils/date";

/**
 * The `when` column, sleep-flavoured: any date or weekday it shows must come
 * from the entry's GROUPING day, not from `loggedAt`. The two differ for a
 * windowed entry — `dayKey` is the civil day at sleep start, `loggedAt` the
 * wake bound — so a July 31 → August 1 sleep files under "July 2026" and the
 * shared `formatHistoryWhen` would caption its row "Aug 1", contradicting the
 * heading it sits under. Times still read at the captured occurrence offset;
 * only the calendar part switches frames. Duration-only entries derive `dayKey`
 * from `loggedAt`, so for them this renders exactly what the shared helper
 * would.
 */
function sleepHistoryWhen(log: SleepLog, kind: HistorySectionKind, lang: string): string {
  if (kind === "today" || kind === "yesterday") return formatHistoryWhen(log, kind, lang);
  const day = parseLocalNoon(log.dayKey);
  if (kind === "month") {
    return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" }).format(day);
  }
  const weekday = new Intl.DateTimeFormat(lang, { weekday: "short" }).format(day);
  return `${weekday} ${formatHistoryWhen(log, "today", lang)}`;
}

/**
 * Every sleep entry the user has, scrollable to the end — check-in's paging
 * pattern adopted verbatim (#696, decided for sleep on #775).
 *
 * No stats, no averages, no total count: a `ScreenHeader` sub-screen has
 * nowhere honest to put a number that only covers the pages already loaded
 * (#705). Aggregates stay on the overview, where the window is complete.
 */
export default function SleepHistoryScreen() {
  const { t, i18n } = useTranslation("sleep");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useSleepHistoryPages(userId);

  const sections = useMemo(() => groupHistorySections(data?.pages.flat() ?? []), [data]);

  const loadMore = useCallback(() => {
    // `hasNextPage` alone isn't enough: onEndReached fires repeatedly while the
    // user keeps dragging, and each call would queue another page fetch.
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <SectionList<SleepLog, HistorySection<SleepLog>>
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
          // made once a page has actually come back empty (#734). While the
          // first page is in flight, and when it failed outright, the honest
          // answer is a different one - either would otherwise tell a returning
          // user their history is gone. A failed background refetch that still
          // has pages cached never reaches here, because the list is not empty.
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
          <SleepEntryRow entry={item} when={sleepHistoryWhen(item, section.kind, i18n.language)} />
        )}
      />
    </SafeAreaView>
  );
}
