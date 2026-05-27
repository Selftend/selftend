import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useHabitLogs, useHabits } from "@/src/features/habits/queries";

export function HabitsQuietWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: habits } = useHabits(userId);
  const { data: logs } = useHabitLogs(userId);

  const active = (habits ?? []).filter((h) => h.archivedAt === null);
  const allLogs = logs ?? [];
  const lastLogOf = (habitId: string) =>
    allLogs
      .filter((l) => l.habitId === habitId)
      .reduce((latest, l) => (l.loggedOn > latest ? l.loggedOn : latest), "");

  // The habit whose most-recent log is oldest (or never logged) has "gone quiet".
  const quiet =
    active.length > 0
      ? [...active].sort((a, b) => (lastLogOf(a.id) < lastLogOf(b.id) ? -1 : 1))[0]
      : null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-act/10">
            <Icon name="schedule" className="size-5 text-act" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.habitsQuiet.title")}</Text>
        </View>
        {quiet ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/tools/habits/${quiet.id}`)}
            className="gap-0.5 rounded-lg border border-border bg-card p-2 active:bg-accent/40"
          >
            <Text className="text-xs font-medium" numberOfLines={1}>
              {quiet.name}
            </Text>
            <Text variant="muted" className="text-[11px]">
              {t("home.widgets.habitsQuiet.nudge")}
            </Text>
          </Pressable>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.habitsQuiet.empty")}
          </Text>
        )}
        {quiet ? (
          <Button
            size="sm"
            variant="ghost"
            className="self-end"
            onPress={() => router.push("/tools/habits")}
          >
            <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="self-start"
            onPress={() => router.push("/tools/habits/new")}
          >
            <Text>{t("home.widgets.habitsQuiet.add")}</Text>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
