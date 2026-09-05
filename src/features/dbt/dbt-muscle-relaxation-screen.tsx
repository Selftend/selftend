import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { FocusSessionShell } from "@/src/components/app/focus-session-shell";
import { ProgressSegments } from "@/src/components/app/progress-segments";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { SegmentedControl } from "@/src/components/app/segmented-control";
import { TechniqueCaution } from "@/src/components/app/technique-caution";
import { formatClock } from "@/src/features/breathing/cycle-math";
import { FORM_COLUMN } from "@/src/lib/layout";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { occurrenceTimeFromDate } from "@/src/lib/occurrence-time";
import { cn } from "@/lib/utils";
import {
  buildSteps,
  groupStartSeconds,
  groupsFor,
  plannedSeconds,
  sessionStateAt,
} from "@/src/features/dbt/muscle-relaxation-plan";
import { useSaveDbtSession } from "@/src/features/dbt/queries";
import type { DbtSessionVariant } from "@/src/features/dbt/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * `/modules/dbt/sessions/muscle-relaxation` - the module's one timed session
 * (spec §3.1.3, design `1d`).
 *
 * It runs on the breathing engine's timing: a wall clock read on every tick and
 * a PURE schedule that answers "which beat is this" from elapsed seconds, so a
 * late tick lands on the right beat rather than drifting. The step shape is
 * grounding's.
 *
 * ☠️ **It departs from both of them on exit, and the departure is the point.**
 * Grounding, breathing and meditation save a partial row on *Finish early* and
 * answer the back gesture with a finish-or-continue dialog (#928). This session
 * records **on completion only**: Stop saves nothing, asks nothing, and returns
 * where the person came from. There is no `stepsCompleted`, because a row here
 * means a finished session and nothing else. The copy says so on screen, so
 * pressing Stop is never a gamble.
 *
 * The caution is inline above Start, always visible, never a modal, never
 * acknowledged and never stored - and the app never asks whether any of it
 * applies to the person (S5).
 */

type Phase = "intro" | "running" | "paused" | "done";

/** How often the clock is read. The schedule is pure, so this only sets smoothness. */
const TICK_MS = 250;

export default function DbtMuscleRelaxationScreen() {
  const { t } = useTranslation("dbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const saveMutation = useSaveDbtSession(user?.id ?? null);

  const [phase, setPhase] = useState<Phase>("intro");
  const [variant, setVariant] = useState<DbtSessionVariant>("full");
  const [elapsed, setElapsed] = useState(0);
  const [savedSeconds, setSavedSeconds] = useState(0);

  // The clock is wall time, not an accumulator: `startMsRef` is pushed forward
  // by however long a pause lasted, so the render and the saved duration read
  // the same paused-aware elapsed time.
  const startMsRef = useRef(0);
  const pausedAtMsRef = useRef<number | null>(null);
  const finishingRef = useRef(false);

  const steps = useMemo(() => buildSteps(variant), [variant]);
  const planned = plannedSeconds(variant);
  const groups = groupsFor(variant);
  const state = sessionStateAt(steps, elapsed);

  const elapsedNow = () => ((pausedAtMsRef.current ?? Date.now()) - startMsRef.current) / 1000;

  const finish = useSingleFlight(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const durationSeconds = Math.round(planned);
    setSavedSeconds(durationSeconds);
    setPhase("done");
    try {
      // The instant and the offset travel together, from ONE call: they
      // describe one moment, and resolving them separately can straddle a
      // clock change. Written on completion ONLY - no update path, no partial
      // row.
      const occurrence = occurrenceTimeFromDate();
      await saveMutation.mutateAsync({
        sessionSlug: "muscle-relaxation",
        variant,
        durationSeconds,
        completedAt: occurrence.occurredAt,
        completedOffsetMinutes: occurrence.occurredOffsetMinutes,
      });
    } catch {
      // The mutation suppresses the global toast, so the failure is said here.
      // The done screen still stands: the person did the session either way,
      // and telling them it "did not happen" would be the wrong sentence.
      showToast({ title: t("session.saveError"), tone: "error" });
    }
  });

  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      const next = elapsedNow();
      if (next >= planned) {
        setElapsed(planned);
        void finish();
        return;
      }
      setElapsed(next);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, planned, finish]);

  function start() {
    startMsRef.current = Date.now();
    pausedAtMsRef.current = null;
    finishingRef.current = false;
    setElapsed(0);
    setPhase("running");
  }

  function pause() {
    pausedAtMsRef.current = Date.now();
    setPhase("paused");
  }

  function resume() {
    if (pausedAtMsRef.current !== null) {
      startMsRef.current += Date.now() - pausedAtMsRef.current;
      pausedAtMsRef.current = null;
    }
    setPhase("running");
  }

  /** Jump to the start of a group - what Back and Next move between. */
  function goToGroup(groupIndex: number) {
    const clamped = Math.max(0, Math.min(groups.length - 1, groupIndex));
    const seconds = groupStartSeconds(steps, clamped);
    startMsRef.current = Date.now() - seconds * 1000;
    if (pausedAtMsRef.current !== null) pausedAtMsRef.current = Date.now();
    setElapsed(seconds);
  }

  // ☠️ Stop saves NOTHING and asks nothing. No dialog, no partial row, no "you
  // were close" - it simply ends and returns. The back gesture is this too.
  function stop() {
    if (router.canGoBack()) router.back();
    else router.replace("/modules/dbt");
  }

  if (phase === "intro") {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className={cn(FORM_COLUMN, "grow gap-6")}>
            <View className="gap-2">
              <Text
                variant="muted"
                className="text-[11px] font-semibold uppercase tracking-[0.1em]"
              >
                {t("session.eyebrow")}
              </Text>
              <ScreenHeader title={t("tools.muscleRelaxation.name")} />
              <Text variant="muted" className="text-[15px] leading-relaxed">
                {t("session.what")}
              </Text>
            </View>

            {/* Always visible, never a modal, never acknowledged, never stored -
                and it tells rather than asks (S5). */}
            <TechniqueCaution
              lines={t("session.caution", { returnObjects: true }) as unknown as string[]}
            />

            <View className="gap-2">
              <Text variant="muted" className="text-[13px] font-semibold">
                {t("session.lengthLabel")}
              </Text>
              <SegmentedControl
                accessibilityLabel={t("session.lengthLabel")}
                value={variant}
                onChange={setVariant}
                options={[
                  { value: "full", label: t("session.variants.full") },
                  { value: "short", label: t("session.variants.short") },
                ]}
              />
              <Text variant="muted" className="text-[12.5px]">
                {t("session.lengthNote", {
                  groups: groups.length,
                  minutes: Math.round(planned / 60),
                })}
              </Text>
            </View>

            <Button onPress={start}>
              <Text>{t("session.start")}</Text>
            </Button>

            <View className="grow" />
            <CrisisSupportBar />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === "done") {
    return (
      <FocusSessionShell eyebrow={t("session.eyebrow")}>
        <View className="grow items-center justify-center gap-5">
          <Icon name="check-circle" size={44} className="text-primary" />
          {/* The done screen states the record and stops. No rating, no "how
              do you feel now", nothing to fill in. */}
          <Text variant="h1" className="text-center text-[22px] font-bold tracking-tight">
            {t("session.done", { minutes: Math.max(1, Math.round(savedSeconds / 60)) })}
          </Text>
          <Button className="w-full" onPress={stop}>
            <Text>{t("session.doneAction")}</Text>
          </Button>
        </View>
      </FocusSessionShell>
    );
  }

  const isPaused = phase === "paused";
  const groupKey = state.step?.group ?? groups[groups.length - 1]!;
  const stepPhase = state.step?.phase ?? "release";

  return (
    <FocusSessionShell
      eyebrow={t("session.eyebrow")}
      trailing={t("session.progress", {
        current: state.groupNumber,
        total: groups.length,
        clock: formatClock(state.totalRemainingSeconds),
      })}
    >
      <View className={cn("grow gap-6 pt-4", isPaused && "opacity-60")}>
        <ProgressSegments total={groups.length} current={Math.max(0, state.groupNumber - 1)} />

        <View className="grow items-center justify-center gap-3">
          <Text variant="h1" className="text-center text-[26px] font-bold tracking-tight">
            {t(`session.groups.${groupKey}`)}
          </Text>
          <Text variant="muted" className="max-w-[46ch] text-center text-[15px] leading-relaxed">
            {t(`session.instructions.${stepPhase}`)}
          </Text>
          <Text
            className="text-[92px] font-extrabold leading-none tabular-nums"
            // The numeral is the clock; the label beneath says which half of the
            // beat it is counting, so the number never has to be guessed at.
            accessibilityLabel={t("session.remaining", {
              seconds: state.stepRemainingSeconds,
            })}
          >
            {state.stepRemainingSeconds}
          </Text>
          <Text variant="muted" className="text-[12px] font-semibold uppercase tracking-[0.18em]">
            {t(`session.phases.${stepPhase}`)}
          </Text>
        </View>

        <View className="gap-3">
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              disabled={state.groupNumber <= 1}
              onPress={() => goToGroup(state.groupNumber - 2)}
            >
              <Text>{t("session.back")}</Text>
            </Button>
            <Button variant="outline" className="flex-1" onPress={isPaused ? resume : pause}>
              <Text>{isPaused ? t("session.resume") : t("session.pause")}</Text>
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={state.groupNumber >= groups.length}
              onPress={() => goToGroup(state.groupNumber)}
            >
              <Text>{t("session.next")}</Text>
            </Button>
          </View>

          <Button variant="ghost" onPress={stop}>
            <Text>{t("session.stop")}</Text>
          </Button>
          {/* Said plainly, on screen, before the press - so leaving is never a
              gamble about what happens to the last nine minutes. */}
          <Text variant="muted" className="text-center text-[12.5px]">
            {isPaused ? t("session.pausedNote") : t("session.stopNote")}
          </Text>

          <CrisisSupportBar />
        </View>
      </View>
    </FocusSessionShell>
  );
}
