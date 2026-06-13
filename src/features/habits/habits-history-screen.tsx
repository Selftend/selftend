import { router } from "expo-router";
import { memo, useCallback, useMemo } from "react";
import { SectionList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useHabits, useHabitLogs } from "@/src/features/habits/queries";
import type { Habit, HabitLog } from "@/src/features/habits/types";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

// Memoized row so the SectionList only re-renders changed entries (#54 — was nested
// .map()s in a ScrollView, all 365 capped rows mounting at once on navigation).
const HabitLogRow = memo(function HabitLogRow({ log, habit }: { log: HabitLog; habit: Habit }) {
  const onPress = useCallback(
    () => router.push({ pathname: "/tools/habits/[id]", params: { id: habit.id } }),
    [habit.id],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={habit.name}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className="flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 active:bg-accent/40"
      role="button"
    >
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-semibold">{habit.name}</Text>
        {log.note ? (
          <Text variant="muted" className="text-xs" numberOfLines={2}>
            {log.note}
          </Text>
        ) : null}
        {habit.identity ? (
          <Text variant="muted" className="text-[10px] uppercase tracking-wider">
            {habit.identity}
          </Text>
        ) : null}
      </View>
      <Icon name="check-circle" className="size-5 text-primary" />
    </Pressable>
  );
});

export default function HabitsHistoryScreen() {
  const { t } = useTranslation("habits");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: habits } = useHabits(userId, { includeArchived: true });
  const { data: logs } = useHabitLogs(userId, { limit: 365 });

  const habitsById = useMemo(() => {
    const map = new Map<string, Habit>();
    (habits ?? []).forEach((habit) => map.set(habit.id, habit));
    return map;
  }, [habits]);

  const sections = useMemo(() => {
    const groups = new Map<string, HabitLog[]>();
    (logs ?? []).forEach((log) => {
      const existing = groups.get(log.loggedOn) ?? [];
      existing.push(log);
      groups.set(log.loggedOn, existing);
    });
    return Array.from(groups.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, data]) => ({ key: date, data }));
  }, [logs]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        // SectionList is the scroll root so off-screen rows recycle. NativeWind does not
        // cssInterop contentContainerClassName here, so style the content directly.
        contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 8 }}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View className="mb-4 gap-2">
            <ScreenHeader title={t("history.title")} />
            <Text variant="muted">{t("history.subtitle")}</Text>
          </View>
        }
        ListEmptyComponent={<Text variant="muted">{t("history.empty")}</Text>}
        renderSectionHeader={({ section }) => (
          <Text className="mb-2 mt-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("history.groupedByDate", { date: section.key })}
          </Text>
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
