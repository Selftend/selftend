import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useActivities } from "@/src/features/activities/queries";
import { useSelectedDate } from "@/src/stores/selected-date-store";

/**
 * CBT behavioural-activation activities scheduled for the day. Named `HabitsWidget`
 * until #330: it reads no habit data at all, only `activity_logs.scheduled_at`, and
 * its per-item link goes to /modules/cbt/activities.
 *
 * Deliberately NOT renamed with it: the registry id `habits-today` (a storage key in
 * `widget_preferences.widget_id` - renaming it would orphan every user's row), and
 * `WIDGET_META`'s `toolKey`, tint and title copy, which decide where the widget is
 * offered and what the user reads. Those are placement and product copy, not
 * description, so they are left for a deliberate product change rather than folded
 * into a data-correctness fix.
 */
export function ActivitiesWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: activities } = useActivities(userId);

  const { selectedDate: todayKey } = useSelectedDate();
  // `scheduledDayKey` is the civil day the activity was PLANNED for, captured when it
  // was planned - compare, never re-bucket, so a plan made before flying east stays on
  // the day it was meant for (#330).
  const scheduledToday = activities?.filter((a) => a.scheduledDayKey === todayKey) ?? [];
  const completedToday = scheduledToday.filter((a) => a.completedAt !== null);
  const firstIncomplete = scheduledToday.find((a) => !a.completedAt) ?? null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="size-8 items-center justify-center rounded-lg bg-act/10">
              <Icon name="directions-run" className="size-5 text-act" />
            </View>
            <Text className="text-sm font-semibold">{t("plan.wizard.toolHabits")}</Text>
          </View>
          {scheduledToday.length > 0 ? (
            <View className="rounded-full bg-muted px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-muted-foreground">
                {t("today.dashboard.habitsProgress", {
                  done: completedToday.length,
                  total: scheduledToday.length,
                })}
              </Text>
            </View>
          ) : null}
        </View>

        {firstIncomplete ? (
          <View className="flex-row items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
            <Text className="flex-1 text-xs text-muted-foreground" numberOfLines={1}>
              {firstIncomplete.activityName}
            </Text>
            <Button
              size="sm"
              variant="outline"
              onPress={() =>
                router.push(
                  `/modules/cbt/activities/${firstIncomplete.id}` as Parameters<
                    typeof router.push
                  >[0],
                )
              }
            >
              <Text>{t("today.plan.open")}</Text>
            </Button>
          </View>
        ) : (
          <Text variant="muted" className="text-xs">
            {scheduledToday.length === 0
              ? t("today.dashboard.habitsHint")
              : t("today.dashboard.habitsAllDone")}
          </Text>
        )}

        <View className="flex-row items-center justify-between">
          <Button size="sm" variant="outline" onPress={() => router.push("/tools/habits/new")}>
            <Icon name="add" className="size-4" />
            <Text>{t("today.dashboard.newHabit")}</Text>
          </Button>
          <Button size="sm" variant="ghost" onPress={() => router.push("/tools/habits")}>
            <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
