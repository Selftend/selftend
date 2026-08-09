import { useCallback } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { EmptyState, ErrorState } from "@/src/components/app/screen-state";
import { Text } from "@/src/components/react-native-reusables/text";
import { breathingSlugs } from "@/src/constants/breathing";
import { formatClock } from "@/src/features/breathing/cycle-math";
import { useBreathingExercises } from "@/src/features/breathing/exercises-queries";
import { useBreathingSessionPages } from "@/src/features/breathing/queries";
import type { MindfulnessSession } from "@/src/features/mindfulness/types";
import { FORM_COLUMN_WIDTH } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";
import { formatAtOffset } from "@/src/utils/date";

/**
 * Every breathing session the user has, scrollable to the end (#778, taking
 * #696's paging as decided).
 *
 * The overview shows five recent rows and stops; this is the only route to an
 * older one. So it carries no cap - it pages until the data runs out, rather
 * than stopping at a silent ceiling and calling itself "all sessions".
 *
 * No totals in the header: a `ScreenHeader` sub-screen has nowhere honest to
 * put a number that only covers the pages already loaded (#705). The lifetime
 * figures live on the overview, where they come from server aggregates.
 */
export default function BreathingHistoryScreen() {
  const { t } = useTranslation("cbt");
  const roomStyle = useRoomStyle("aqua");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: customExercises } = useBreathingExercises(userId);
  const customIds = (customExercises ?? []).map((e) => e.id);
  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useBreathingSessionPages(userId, customIds);

  const sessions = data?.pages.flat() ?? [];

  const patternName = (exerciseName: string) => {
    if (breathingSlugs.includes(exerciseName)) {
      return t(`breathing.exercises.${exerciseName}.title`);
    }
    return (
      (customExercises ?? []).find((e) => e.id === exerciseName)?.name ??
      t("breathing.deletedExercise")
    );
  };

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
      <FlatList<MindfulnessSession>
        data={sessions}
        keyExtractor={(item) => item.id}
        // The FlatList is the scroll root so rows recycle and onEndReached can
        // drive paging. NativeWind does not cssInterop FlatList, so both the
        // padding and the reading column ride contentContainerStyle - a
        // className is silently dropped, and a centred wrapper would centre only
        // the header.
        contentContainerStyle={{
          flexGrow: 1,
          padding: 16,
          width: "100%",
          maxWidth: FORM_COLUMN_WIDTH,
          alignSelf: "center",
        }}
        // The hairline sits between rows rather than on them, so the first row
        // doesn't draw a second rule 2px under the header.
        ItemSeparatorComponent={() => <View className="h-px bg-border" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-2 gap-2">
            <ScreenHeader title={t("breathing.allHistory.title")} />
            <Text variant="muted">{t("breathing.allHistory.description")}</Text>
          </View>
        }
        ListEmptyComponent={
          // "No sessions yet" is a claim about the account, so it may only be
          // made once a page has actually come back empty. While the first page
          // is in flight, and when it failed outright, the honest answer is a
          // different one - either would otherwise tell a returning user their
          // history is gone. A failed background refetch that still has pages
          // cached never reaches here, because the list is not empty.
          isPending ? null : isError ? (
            <ErrorState
              icon="cloud-off"
              title={t("breathing.allHistory.error.title")}
              description={t("breathing.allHistory.error.description")}
              action={{ label: t("errors:fallback.retry"), onPress: () => void refetch() }}
            />
          ) : (
            <EmptyState
              icon="history"
              title={t("breathing.allHistory.empty.title")}
              description={t("breathing.allHistory.empty.description")}
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
        renderItem={({ item }) => (
          <View className="flex-row items-center gap-4 px-1 py-3">
            <Text className="flex-1 text-sm" numberOfLines={1}>
              {patternName(item.exerciseName)}
            </Text>
            {item.cycles != null ? (
              <Text variant="muted" className="shrink-0 text-[12.5px] tabular-nums">
                {t("breathing.cycles", { count: item.cycles })}
              </Text>
            ) : null}
            <Text className="shrink-0 text-[12.5px] tabular-nums">
              {item.durationSeconds != null
                ? formatClock(item.durationSeconds)
                : t("breathing.minutes", { value: item.durationMinutes })}
            </Text>
            <Text variant="muted" className="shrink-0 text-xs tabular-nums">
              {formatAtOffset(item.completedAt, item.completedOffsetMinutes)}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
