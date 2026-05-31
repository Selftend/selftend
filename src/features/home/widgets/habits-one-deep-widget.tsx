import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useHabits } from "@/src/features/habits/queries";
import { dayOfYear } from "@/src/utils/date";

export function HabitsOneDeepWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: habits } = useHabits(userId);

  const active = (habits ?? []).filter((h) => h.archivedAt === null);
  const habit = active.length > 0 ? active[dayOfYear(new Date()) % active.length] : null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-act/10">
            <Icon name="center-focus-strong" className="size-5 text-act" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.habitsOneDeep.title")}</Text>
        </View>
        {habit ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/tools/habits/${habit.id}`)}
            className="gap-0.5 rounded-lg border border-border bg-card p-2 active:bg-accent/40"
          >
            <Text className="text-xs font-medium" numberOfLines={1}>
              {habit.name}
            </Text>
            {habit.identity.trim() ? (
              <Text variant="muted" className="text-[11px]" numberOfLines={2}>
                {habit.identity}
              </Text>
            ) : null}
          </Pressable>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.habitsOneDeep.empty")}
          </Text>
        )}
        {habit ? (
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
            <Text>{t("home.widgets.habitsOneDeep.add")}</Text>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
