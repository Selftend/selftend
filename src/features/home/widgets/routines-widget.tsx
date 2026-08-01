import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useRoutinesToday } from "@/src/features/routines/use-routines-today";

// The single aggregate routines-today card (spec #37 Home integration, #50):
// one widget summarizing SCHEDULED-TODAY routines' progress - deliberately not
// one-widget-per-routine, and never default-seeded (opt-in via the Add-Widget
// modal only). States: quiet doorway to the Routines page at zero routines; a
// per-routine progress summary while scheduled steps are open; a calm "done
// for today" (no streaks, no celebration) when everything scheduled is
// complete. On days where the user HAS routines but none are scheduled
// (off-day custom cadences, on-demand-only), the widget renders NOTHING
// (#104) - no empty shell, no nudge.
export function RoutinesWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("routines");
  const today = useRoutinesToday(userId);

  // Nothing scheduled today (but routines exist): render nothing at all.
  if (!today.isLoading && today.hasRoutines && today.scheduledViews.length === 0) return null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="size-8 items-center justify-center rounded-lg bg-muted">
              <Icon name="repeat" className="size-5 text-muted-foreground" />
            </View>
            <Text className="text-sm font-semibold">{t("widget.title")}</Text>
          </View>
          {today.totalSteps > 0 ? (
            <View className="rounded-full bg-muted px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-muted-foreground">
                {t("widget.progress", { done: today.doneSteps, total: today.totalSteps })}
              </Text>
            </View>
          ) : null}
        </View>

        {today.isLoading ? null : !today.hasRoutines ? (
          <>
            <Text variant="muted" className="text-xs">
              {t("widget.emptyBody")}
            </Text>
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              onPress={() => router.push("/routines" as Parameters<typeof router.push>[0])}
            >
              <Text>{t("widget.emptyCta")}</Text>
              <Icon name="arrow-forward" className="size-4" />
            </Button>
          </>
        ) : today.allComplete ? (
          <Text variant="muted" className="text-xs">
            {t("widget.allDone")}
          </Text>
        ) : (
          <View className="gap-1.5">
            {today.scheduledViews.map(({ routine, day }) => (
              <View
                key={routine.id}
                className="flex-row items-center gap-3 rounded-lg bg-muted/50 px-3 py-2"
              >
                {day.status === "complete" ? (
                  <Icon name="check" className="size-4 text-primary" />
                ) : null}
                <Text className="flex-1 text-xs text-muted-foreground" numberOfLines={1}>
                  {routine.name}
                </Text>
                {day.totalCount > 0 ? (
                  <Text className="text-xs font-semibold text-muted-foreground">
                    {t("widget.routineProgress", { done: day.doneCount, total: day.totalCount })}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {!today.isLoading && today.hasRoutines ? (
          <View className="flex-row items-center justify-end">
            <Button
              size="sm"
              variant="ghost"
              onPress={() => router.push("/routines" as Parameters<typeof router.push>[0])}
            >
              <Text className="text-muted-foreground">{t("widget.open")}</Text>
              <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
            </Button>
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}
