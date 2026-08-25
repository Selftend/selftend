import { type Href } from "expo-router";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { RoutineDayStrip } from "@/src/features/routines/day-strip";
import { isScheduledOn } from "@/src/features/routines/scheduling";
import {
  deriveRoutine,
  type RoutineStatus,
  type RoutineToolRecords,
  type SteppableToolId,
} from "@/src/features/routines/derive";
import { useRoutines } from "@/src/features/routines/queries";
import { buildStarterSteps } from "@/src/features/routines/starter";
import { useKeepStarterRoutine } from "@/src/features/routines/use-keep-starter-routine";
import { useRoutineToolRecords } from "@/src/features/routines/use-routine-tool-records";
import type { RoutineWithSteps } from "@/src/features/routines/types";
import { useWidgetPreferences } from "@/src/features/home/queries";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";
import { currentDateKey, parseLocalNoon } from "@/src/utils/date";
import { cn } from "@/lib/utils";

const STATUS_KEYS: Record<RoutineStatus, "notStarted" | "inProgress" | "complete"> = {
  not_started: "notStarted",
  in_progress: "inProgress",
  complete: "complete",
};

export default function RoutinesHomeScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("routines");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: routines, isLoading } = useRoutines(userId);
  const allRoutines = routines ?? [];

  // One record fetch per tool any routine references; deriveRoutine reads them all.
  const referencedTools: SteppableToolId[] = [];
  for (const routine of allRoutines) {
    for (const step of routine.steps) {
      if (!referencedTools.includes(step.toolId)) referencedTools.push(step.toolId);
    }
  }
  const records = useRoutineToolRecords(userId, referencedTools);
  const dayKey = currentDateKey();

  // The starter offer is gated on zero routines; widget prefs feed the builder.
  const { data: widgetPrefs } = useWidgetPreferences(allRoutines.length === 0 ? userId : null);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="mx-auto w-full max-w-2xl gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("home.title")} />
            <Text variant="muted">{t("home.subtitle")}</Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <Button onPress={() => pushWithOrigin("/routines/new" as Href)} className="self-start">
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("cta.newRoutine")}</Text>
            </Button>
          </View>

          {allRoutines.length === 0 ? (
            <RoutinesEmptyState keptWidgetIds={(widgetPrefs ?? []).map((pref) => pref.widgetId)} />
          ) : (
            <View className="gap-3">
              <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("home.listHeading")}
              </Text>
              <View className="gap-3">
                {allRoutines.map((routine) => (
                  <RoutineCard
                    key={routine.id}
                    routine={routine}
                    records={records}
                    dayKey={dayKey}
                    onOpen={() =>
                      pushWithOrigin({
                        pathname: "/routines/[id]",
                        params: { id: routine.id },
                      } as Href)
                    }
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface RoutineCardProps {
  routine: RoutineWithSteps;
  records: RoutineToolRecords;
  dayKey: string;
  onOpen: () => void;
}

function RoutineCard({ routine, records, dayKey, onOpen }: RoutineCardProps) {
  const { t } = useTranslation("routines");
  const day = deriveRoutine(routine.steps, records, dayKey);
  const complete = day.status === "complete";

  // Off-today and on-demand routines with nothing done yet swap "Not started"
  // for a calm schedule label (#106) - "not expected today", never "behind".
  // Any progress today (a manual run) flips the card back to live tracking.
  const scheduledToday = isScheduledOn(routine, parseLocalNoon(dayKey));
  const restingToday = !scheduledToday && day.doneCount === 0;
  // Daily routines are always scheduled, so only the other three cadences
  // can reach the label.
  const scheduleLabel = !restingToday
    ? null
    : routine.cadence === "on-demand"
      ? t("schedule.onDemand")
      : routine.cadence === "weekdays"
        ? t("schedule.weekdays")
        : t("schedule.customDays", {
            days: [...routine.customDays]
              .sort((a, b) => a - b)
              .map((d) => t(`schedule.weekday.${d}` as const))
              .join(", "),
          });

  return (
    <Pressable
      accessibilityLabel={t("home.openDetail")}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onOpen}
      className="gap-2 rounded-2xl border border-border bg-card p-4 active:bg-accent/40"
      role="button"
    >
      <View className="flex-row items-center gap-3">
        <View
          className={cn(
            "size-10 items-center justify-center rounded-xl border",
            complete ? "border-primary/40 bg-primary/15" : "border-border bg-background",
          )}
        >
          <Icon
            name={complete ? "check" : "checklist"}
            className={cn("size-5", complete ? "text-primary" : "text-muted-foreground")}
          />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold">{routine.name}</Text>
          {restingToday ? (
            <Text className="text-xs text-muted-foreground">{scheduleLabel}</Text>
          ) : (
            <Text
              className={cn(
                "text-xs",
                day.status === "not_started" ? "text-muted-foreground" : "text-primary",
              )}
            >
              {t(`status.${STATUS_KEYS[day.status]}`)}
            </Text>
          )}
        </View>
        {/* A resting card (off-today, nothing done) also hides the 0/N badge:
            an unmet count has no place on a day when nothing was expected. */}
        {day.totalCount > 0 && !restingToday ? (
          <Text variant="muted" className="text-xs">
            {t("status.progress", { done: day.doneCount, total: day.totalCount })}
          </Text>
        ) : null}
        <Icon name="chevron-right" className="size-5 text-muted-foreground" />
      </View>

      <View className="gap-1.5">
        <Text variant="muted" className="text-[10px] uppercase tracking-wider">
          {t("strip.label")}
        </Text>
        <RoutineDayStrip steps={routine.steps} records={records} schedule={routine} />
      </View>
    </Pressable>
  );
}

// Empty state: the declinable pre-composed starter offer when the kept widgets
// yield enough candidate steps (>= 2), otherwise a quiet build-your-own card.
// "Keep" writes one routine + N steps through the normal repository path;
// "Skip" just dismisses - nothing is ever created silently.
function RoutinesEmptyState({ keptWidgetIds }: { keptWidgetIds: readonly string[] }) {
  const { t } = useTranslation("routines");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { keep, saving, error: starterError } = useKeepStarterRoutine(userId);
  const [starterDismissed, setStarterDismissed] = useState(false);

  const starterSteps = buildStarterSteps(keptWidgetIds);

  const handleKeep = () => {
    if (!starterSteps) return;
    void keep({ name: t("form.defaultName"), steps: starterSteps });
  };

  if (starterSteps && !starterDismissed) {
    return (
      <View className="gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <Text className="text-base font-semibold">{t("home.starterTitle")}</Text>
        <Text variant="muted">{t("home.starterBody")}</Text>
        <View className="gap-2">
          <Text className="text-sm font-semibold">{t("form.defaultName")}</Text>
          {starterSteps.map((toolId, index) => (
            <View key={toolId} className="flex-row items-center gap-3">
              <View className="size-7 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                <Text className="text-xs font-semibold text-primary">{index + 1}</Text>
              </View>
              <Text className="text-sm">{t(`tools.${toolId}`)}</Text>
            </View>
          ))}
        </View>
        {starterError ? <Text className="text-sm text-destructive">{starterError}</Text> : null}
        <View className="flex-row gap-2">
          <Button disabled={saving || !user} onPress={handleKeep}>
            {saving ? <ActivityIndicator color="#ffffff" /> : null}
            <Text>{t("cta.keep")}</Text>
          </Button>
          <Button disabled={saving} onPress={() => setStarterDismissed(true)} variant="ghost">
            <Text>{t("cta.skip")}</Text>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-5">
      <Text className="text-base font-semibold">{t("home.emptyTitle")}</Text>
      <Text variant="muted">{t("home.emptyBody")}</Text>
    </View>
  );
}
