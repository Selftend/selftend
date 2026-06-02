import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useHabits, useHabitLogs } from "@/src/features/habits/queries";
import type { Habit } from "@/src/features/habits/types";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

export default function HabitsHistoryScreen() {
  const { t } = useTranslation("habits");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: habits } = useHabits(userId, { includeArchived: true });
  const { data: logs } = useHabitLogs(userId, { limit: 365 });

  const habitsById = (() => {
    const map = new Map<string, Habit>();
    (habits ?? []).forEach((habit) => map.set(habit.id, habit));
    return map;
  })();

  const grouped = (() => {
    const groups = new Map<string, typeof logs>();
    (logs ?? []).forEach((log) => {
      const existing = groups.get(log.loggedOn) ?? [];
      existing.push(log);
      groups.set(log.loggedOn, existing as never);
    });
    return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  })();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow gap-6 p-6">
        <View className="gap-2">
          <ScreenHeader title={t("history.title")} />
          <Text variant="muted">{t("history.subtitle")}</Text>
        </View>

        {grouped.length === 0 ? (
          <Text variant="muted">{t("history.empty")}</Text>
        ) : (
          <View className="gap-4">
            {grouped.map(([date, entries]) => (
              <View key={date} className="gap-2">
                <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("history.groupedByDate", { date })}
                </Text>
                <View className="gap-2">
                  {(entries ?? []).map((log) => {
                    const habit = habitsById.get(log.habitId);
                    if (!habit) return null;
                    return (
                      <Pressable
                        key={log.id}
                        accessibilityRole="button"
                        accessibilityLabel={habit.name}
                        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                        onPress={() =>
                          router.push({
                            pathname: "/tools/habits/[id]",
                            params: { id: habit.id },
                          })
                        }
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
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
