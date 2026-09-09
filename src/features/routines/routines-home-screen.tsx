import { type Href } from "expo-router";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useIsFetching } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { RoutineDayStrip } from "@/src/features/routines/day-strip";
import { isScheduledOn } from "@/src/features/routines/scheduling";
import {
  deriveRoutine,
  STEPPABLE_TOOL_IDS,
  type RoutineStatus,
  type RoutineToolRecords,
  type SteppableToolId,
} from "@/src/features/routines/derive";
import { useRoutines } from "@/src/features/routines/queries";
import { buildStarterSteps } from "@/src/features/routines/starter";
import { areToolRecordsReady, toolsWithRecords } from "@/src/features/routines/starter-offer";
import { StarterStepList } from "@/src/features/routines/starter-step-list";
import { useKeepStarterRoutine } from "@/src/features/routines/use-keep-starter-routine";
import { useRoutineToolRecords } from "@/src/features/routines/use-routine-tool-records";
import type { RoutineWithSteps } from "@/src/features/routines/types";
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
  // On the empty path the same hook feeds the starter offer instead (#1954): the
  // full steppable list, so the composition reads every tool the person has records
  // in. Honest cost, accepted: a routine-less person enables ~17 feature queries at
  // the recent-list limit - the fetch the second-action card already makes for the
  // same population, on the same cache. Only once the list is KNOWN empty, so a
  // still-loading list does not fire the wide fetch for someone who has routines.
  const hasNoRoutines = routines !== undefined && routines.length === 0;
  const records = useRoutineToolRecords(
    userId,
    hasNoRoutines ? STEPPABLE_TOOL_IDS : referencedTools,
  );
  const dayKey = currentDateKey();

  if (isLoading) {
    return <ScreenLoading title={t("home.title")} />;
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

          {hasNoRoutines ? (
            <RoutinesEmptyState records={records} />
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

// Empty state: the declinable pre-composed starter offer when the person has records
// in enough steppable tools (>= 2), otherwise a quiet build-your-own card. "Keep"
// writes one routine + N steps through the normal repository path; "Skip" just
// dismisses - nothing is ever created silently.
//
// ⚠️ There is deliberately NO second-action records gate here (spec #1885 §5.3,
// sub-decision 2, dissolved on arithmetic). `countToolsWithRecords` sums a SUPERSET
// of what composition counts and `SECOND_ACTION_MIN` = `STARTER_STEP_MIN` = 2, so a
// successful composition already implies >= 2 distinct tools with records - the
// branch that would sit here could never reject anything. Do not "restore" it
// without redoing that arithmetic.
function RoutinesEmptyState({ records }: { records: RoutineToolRecords }) {
  const { t } = useTranslation("routines");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { keep, saving, error: starterError } = useKeepStarterRoutine(userId);
  const [starterDismissed, setStarterDismissed] = useState(false);

  // Three states: `undefined` while the records are still loading (nothing is
  // claimed either way - neither an offer nor "build your own"), `null` when they
  // compose nothing, or the steps.
  //
  // A slice that ERRORS stays undefined, so readiness alone would blank this
  // state for good after one failed feature query. Once nothing is fetching any
  // more, an unready shape means a failure, not a wait: fall back to the quiet
  // card rather than compose an offer from the slices that did arrive - fewer
  // candidates is a smaller routine than the person earned, and the card is the
  // calmer wrong answer.
  const fetching = useIsFetching() > 0;
  const starterSteps = areToolRecordsReady(records)
    ? buildStarterSteps(toolsWithRecords(records))
    : fetching
      ? undefined
      : null;
  if (starterSteps === undefined) return null;

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
          <StarterStepList steps={starterSteps} />
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
