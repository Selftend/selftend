import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { memo, useCallback, useMemo } from "react";
import { ActivityIndicator, Pressable, SectionList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { EmptyState, ErrorState } from "@/src/components/app/screen-state";
import { Text } from "@/src/components/react-native-reusables/text";
import { useHabitChipPalette } from "@/src/features/habits/habit-color";
import {
  formatHabitHistoryDay,
  groupLogsByDay,
  type HabitHistorySection,
} from "@/src/features/habits/history-groups";
import { useHabitLogPages, useHabits } from "@/src/features/habits/queries";
import type { Habit, HabitLog } from "@/src/features/habits/types";
import { FORM_COLUMN_WIDTH } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

/**
 * One tick.
 *
 * No timestamp column: `logged_on` is a `date` with one row per habit per day,
 * so inside a day group there is no time to show and the 84px column the
 * check-in row spends on one would be empty (#762). The note takes its own
 * line instead, which is what that width is worth here.
 */
const HabitLogRow = memo(function HabitLogRow({ log, habit }: { log: HabitLog; habit: Habit }) {
  const pushWithOrigin = usePushWithOrigin();
  const chip = useHabitChipPalette()[habit.color];
  const onPress = useCallback(
    () => pushWithOrigin({ pathname: "/tools/habits/[id]", params: { id: habit.id } }),
    [habit.id, pushWithOrigin],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={habit.name}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className="flex-row items-start gap-3 py-3 active:opacity-70"
      role="button"
    >
      {/* The habit's own colour, ringed in its ink so the light hues stay
          perceivable against the surface (WCAG 1.4.11). */}
      <View
        aria-hidden
        className="mt-1.5 size-2.5 rounded-full border"
        style={{ backgroundColor: chip.accent, borderColor: chip.ink }}
      />
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-semibold">{habit.name}</Text>
        {log.note ? (
          <Text variant="muted" className="text-[13px] leading-5">
            {log.note}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

/**
 * Every tick the user has, scrollable to the end (#762, decided on #714/#696).
 *
 * The screen this replaces asked for 365 rows once and called that all history.
 * For a five-habit user that is ten weeks - and nothing said so.
 */
export default function HabitsHistoryScreen() {
  const { t, i18n } = useTranslation("habits");
  const roomStyle = useRoomStyle("act");
  const { user } = useSession();
  const userId = user?.id ?? null;

  // Archived habits included: their ticks are still history, and a row that
  // cannot name its habit renders as nothing at all. This is the SAME cache
  // entry the overview reads (#762) - the overview filters the archived ones
  // out of its list rather than paying for a second fetch of the same table.
  const { data: habits } = useHabits(userId, { includeArchived: true });
  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useHabitLogPages(userId);

  const habitsById = useMemo(() => {
    const map = new Map<string, Habit>();
    (habits ?? []).forEach((habit) => map.set(habit.id, habit));
    return map;
  }, [habits]);

  const sections = useMemo(() => groupLogsByDay(data?.pages.flat()), [data]);

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
      <SectionList<HabitLog, HabitHistorySection>
        sections={sections}
        keyExtractor={(item) => item.id}
        // The SectionList is the scroll root so rows recycle and onEndReached
        // can drive paging. NativeWind does not cssInterop SectionList, so both
        // the padding and the reading column ride contentContainerStyle - a
        // className is silently dropped, and a centred wrapper would centre only
        // the header.
        contentContainerStyle={{
          flexGrow: 1,
          padding: 16,
          width: "100%",
          maxWidth: FORM_COLUMN_WIDTH,
          alignSelf: "center",
        }}
        stickySectionHeadersEnabled={false}
        // The hairline sits between rows rather than on them, so the first row
        // of a day doesn't draw a second rule under its own header rule.
        ItemSeparatorComponent={() => <View className="h-px bg-border" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-2 gap-2">
            <ScreenHeader title={t("history.title")} />
            <Text variant="muted">{t("history.subtitle")}</Text>
          </View>
        }
        ListEmptyComponent={
          // "Nothing here yet" is a claim about the account, so it may only be
          // made once a page has actually come back empty. While the first page
          // is in flight, and when it failed outright, the honest answer is a
          // different one - either would otherwise tell a returning user with
          // hundreds of ticks that there is nothing here. A failed background
          // refetch that still has pages cached never reaches this branch,
          // because the list is not empty.
          isPending ? null : isError ? (
            <ErrorState
              icon="cloud-off"
              title={t("history.error.title")}
              description={t("history.error.description")}
              action={{ label: t("errors:fallback.retry"), onPress: () => void refetch() }}
            />
          ) : (
            <EmptyState
              icon="history"
              title={t("history.title")}
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
              {formatHabitHistoryDay(section.key, t, i18n.language)}
            </Text>
            <View className="h-px flex-1 bg-border" />
          </View>
        )}
        renderItem={({ item }) => {
          const habit = habitsById.get(item.habitId);
          if (!habit) return null;
          return <HabitLogRow log={item} habit={habit} />;
        }}
      />
    </SafeAreaView>
  );
}
