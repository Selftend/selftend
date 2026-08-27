import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { Pressable, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cancelAnimation, useSharedValue, withTiming, Easing } from "react-native-reanimated";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { FocusSessionShell } from "@/src/components/app/focus-session-shell";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { LoadingState } from "@/src/components/app/screen-state";
import { breathingPatterns } from "@/src/constants/breathing";
import type { BreathingPhase } from "@/src/constants/breathing";
import { BreathingPacer } from "@/src/features/breathing/breathing-pacer";
import { PhaseTimingBar } from "@/src/features/breathing/phase-timing-bar";
import { SessionLengthButtons } from "@/src/features/breathing/session-length-buttons";
import {
  totalSeconds,
  formatClock,
  elapsedMinutes,
  cycleSeconds,
} from "@/src/features/breathing/cycle-math";
import { pacerColors } from "@/src/features/breathing/pacer-colors";
import { scheduleStateAt } from "@/src/features/breathing/schedule";
import { resolveBuiltin, useResolvedExercise } from "@/src/features/breathing/resolve-exercise";
import { useBreathingExercises } from "@/src/features/breathing/exercises-queries";
import { SoundsSheet } from "@/src/features/breathing/sounds-sheet";
import { VolumeSlider } from "@/src/components/app/volume-slider";
import { ambientSoundLookup, breathSoundLookup } from "@/src/constants/breathing-sounds";
import { playIntroCue, useBreathingAudio } from "@/src/features/breathing/use-breathing-audio";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useColorSchemeName } from "@/src/lib/color-scheme";
import {
  announceMessage,
  DEFAULT_INTERACTIVE_HIT_SLOP,
  politeLiveRegionProps,
  useReduceMotionEnabled,
} from "@/src/lib/accessibility";
import { useSaveBreathingSession } from "@/src/features/breathing/queries";
import { FORM_COLUMN } from "@/src/lib/layout";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

type ScreenPhase = "intro" | "preroll" | "active";

const TICK_MS = 250;
const DEFAULT_PATTERN = "box-breathing";
// Pre-resolved fallback for when a remembered pattern no longer exists; a
// module constant so its identity is stable across renders (the ticking
// effect keys on `resolved`).
const DEFAULT_RESOLVED = resolveBuiltin(DEFAULT_PATTERN);
// A beat of silence after the spoken intro before the breathing sequence starts.
const POST_INTRO_PAUSE_MS = 1000;
// The design draws the focal element at 268px inside a 620px column; at the
// 360dp floor the content column is 312px (24px padding each side), so the
// same size fits every supported width without scaling.
const PACER_SIZE = 268;

type PrefsPatch = {
  breathVolume?: number;
  ambientVolume?: number;
  lastBreathingPatternId?: string;
  breathingCycles?: number;
};

export default function BreathingSessionScreen() {
  const { t } = useTranslation("cbt");
  const { pattern: patternParam } = useLocalSearchParams<{ pattern?: string }>();
  const { user } = useSession();
  const navigation = useNavigation();
  const showToast = useToastStore((state) => state.showToast);

  const { data: prefs } = useUserPreferences(user?.id ?? null);
  const { data: customExercises } = useBreathingExercises(user?.id ?? null);
  const updatePrefs = useUpdateUserPreferences(user?.id ?? null);

  // The active pattern is fully derived: an explicit in-session choice wins,
  // then the ?pattern param, then the server-remembered last one, then a
  // sensible default - so prefs loading needs no adoption effect.
  const [chosenPatternId, setChosenPatternId] = useState<string | null>(null);
  const requestedPatternId =
    chosenPatternId ?? (patternParam || prefs?.lastBreathingPatternId || DEFAULT_PATTERN);
  const requested = useResolvedExercise(requestedPatternId);
  // If the requested (non-param) pattern no longer resolves - e.g. its custom
  // exercise was deleted but `lastBreathingPatternId` still points at it -
  // fall back to the default instead of dead-ending on the notFound screen.
  // A notFound from an explicit ?pattern param is left to show notFound (the
  // user deep-linked to a specific, missing exercise).
  const fallbackToDefault =
    requested.notFound && !patternParam && requestedPatternId !== DEFAULT_PATTERN;
  const patternId = fallbackToDefault ? DEFAULT_PATTERN : requestedPatternId;
  const { resolved, isLoading, notFound } = fallbackToDefault
    ? { resolved: DEFAULT_RESOLVED, isLoading: false, notFound: false }
    : requested;

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>("intro");
  const [paused, setPaused] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase | null>(null);
  const [phaseIdxInCycle, setPhaseIdxInCycle] = useState(-1);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);
  const [soundsOpen, setSoundsOpen] = useState(false);

  // Volume is frontend-authoritative (instant audio); the DB only stores the
  // last value so it restores next session. The server value seeds the slider
  // until the user drags it, then the local override owns it.
  const [breathVolumeOverride, setBreathVolumeOverride] = useState<number | null>(null);
  const [ambientVolumeOverride, setAmbientVolumeOverride] = useState<number | null>(null);
  const breathVolume = breathVolumeOverride ?? prefs?.breathVolume ?? 0.7;
  const ambientVolume = ambientVolumeOverride ?? prefs?.ambientVolume ?? 0.5;

  // Global cycle count: the local override, else the server-remembered count,
  // else the resolved pattern's default once it loads.
  const [cyclesOverride, setCyclesOverride] = useState<number | null>(null);
  const selectedCycles = cyclesOverride ?? (prefs?.breathingCycles || resolved?.defaultCycles || 0);

  const phaseIndexRef = useRef(-1);
  const announcedIndexRef = useRef(-1);
  const startMsRef = useRef(0);
  // Non-zero exactly while paused; the clock helper reads it so both the tick
  // and the save path measure the same paused-aware elapsed time.
  const pausedAtMsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishingRef = useRef(false);
  const prerollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reduceMotionEnabled = useReduceMotionEnabled();
  // The one session clock (#777): the pacer disc, the halo, the progress ring,
  // the phase text and the countdown all derive from `startMsRef` through
  // scheduleStateAt. `breath` and `cycleProgress` are re-anchored to it at
  // every phase boundary, so animation and text cannot drift apart.
  const breath = useSharedValue(0);
  const cycleProgress = useSharedValue(0);
  const saveMutation = useSaveBreathingSession(user?.id ?? null);
  const audioPrefs = mergeUserPreferences(prefs, {});

  const elapsedNow = () => ((pausedAtMsRef.current || Date.now()) - startMsRef.current) / 1000;

  const patchPrefs = (p: PrefsPatch) => {
    if (!user?.id) return;
    // Best-effort persistence of volume/cycle/last-pattern prefs; a failed write must
    // not become an unhandled rejection (the local UI state is authoritative this session).
    void updatePrefs.mutateAsync(p).catch(() => undefined);
  };

  const selectPattern = (id: string) => {
    if (id === patternId) return;
    setChosenPatternId(id);
    patchPrefs({ lastBreathingPatternId: id }); // cycles are global - keep them across patterns
  };

  // Cycle count is global: change it locally and persist for next session.
  const changeCycles = (next: number) => {
    setCyclesOverride(next);
    patchPrefs({ breathingCycles: next });
  };

  useBreathingAudio({
    active: screenPhase === "active" && !paused,
    phaseLabel: currentPhase?.label ?? null,
    breathSoundId: audioPrefs.breathSoundId,
    ambientSoundId: audioPrefs.ambientSoundId,
    breathVolume,
    ambientVolume,
  });

  const colorScheme = useColorSchemeName();
  const accent = resolved?.color ?? "aqua";
  // Identity-stable per (colour, scheme): the countdown rerenders this screen
  // several times a second during a session, and the pacer must not see a fresh
  // colours object each time.
  const pacer = useMemo(() => pacerColors(accent, colorScheme), [accent, colorScheme]);

  // Where each phase starts, as a 0..1 fraction of one cycle - the ring's
  // anchor points and the phase marks' positions.
  const phaseFractions = useMemo(() => {
    if (!resolved) return [];
    const cycleLen = cycleSeconds(resolved.phases);
    let acc = 0;
    return resolved.phases.map((phase) => {
      const fraction = acc / cycleLen;
      acc += phase.durationSeconds;
      return fraction;
    });
  }, [resolved]);

  // When the remembered pattern falls back to the default, also clear the
  // stale remembered id (best-effort) so every param-less entry point (home
  // button, widget, suggestions) keeps working next session.
  useEffect(() => {
    if (!fallbackToDefault) return;
    patchPrefs({ lastBreathingPatternId: DEFAULT_PATTERN });
    // patchPrefs reads latest prefs/user via closure; deps kept to the resolution signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackToDefault]);

  /**
   * Re-anchor the animation to the clock for the phase that just started (or,
   * after a resume, for wherever mid-phase the clock actually is). Animating
   * over the REMAINING time rather than the phase's full duration is what makes
   * pause/resume exact and keeps the ring self-correcting.
   *
   * Reduced motion (#777): no continuous motion at all - the disc jumps to the
   * phase's end size and the ring steps to the phase boundary, so timing is
   * carried by the phase name, the per-phase countdown and those discrete
   * steps instead.
   */
  const animateForPhase = (phase: BreathingPhase, idxInCycle: number, cycleElapsed: number) => {
    if (!resolved) return;
    const cycleLen = cycleSeconds(resolved.phases);
    const phaseStart = phaseFractions[idxInCycle] * cycleLen;
    const remainingMs = Math.max(0, (phaseStart + phase.durationSeconds - cycleElapsed) * 1000);
    const endFraction = (phaseStart + phase.durationSeconds) / cycleLen;
    const breathTarget = phase.label === "inhale" ? 1 : phase.label === "exhale" ? 0 : null;

    if (reduceMotionEnabled) {
      if (breathTarget !== null) breath.set(breathTarget);
      cycleProgress.set(phaseFractions[idxInCycle]);
      return;
    }
    cycleProgress.set(Math.min(1, cycleElapsed / cycleLen));
    cycleProgress.set(withTiming(endFraction, { duration: remainingMs, easing: Easing.linear }));
    if (breathTarget !== null) {
      breath.set(
        withTiming(breathTarget, { duration: remainingMs, easing: Easing.inOut(Easing.ease) }),
      );
    }
  };

  const handleFinish = async () => {
    // Declared above the ticking effect that calls it (compiler lint: no
    // use-before-declaration), so `resolved` isn't narrowed yet — every caller
    // runs after the not-found guard, making this a type-level guard only.
    if (!resolved || !selectedCycles) return;
    // The clock is the source of truth for what gets saved; before beginActive()
    // sets it there is no session to record, only a preroll to abandon.
    if (!startMsRef.current) return;
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const planned = totalSeconds(resolved.phases, selectedCycles);
    const elapsed = elapsedNow();
    const remaining = Math.max(0, planned - elapsed);
    const elapsedMins = elapsedMinutes(planned, remaining);
    // Completed full cycles + exact elapsed seconds (capped at the planned total) for history.
    const completedCycles = Math.min(
      selectedCycles,
      Math.floor(elapsed / cycleSeconds(resolved.phases)),
    );
    const elapsedSeconds = Math.round(Math.min(elapsed, planned));
    try {
      await saveMutation.mutateAsync({
        exerciseName: resolved.exerciseName,
        durationMinutes: elapsedMins,
        reflection: "",
        feelingAfter: null,
        cycles: completedCycles,
        durationSeconds: elapsedSeconds,
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace("/tools/breathing" as Parameters<typeof router.replace>[0]);
    } catch {
      finishingRef.current = false;
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  const pauseSession = useCallback(() => {
    if (pausedAtMsRef.current) return;
    pausedAtMsRef.current = Date.now();
    // Freeze the animation exactly where the clock stopped.
    cancelAnimation(breath);
    cancelAnimation(cycleProgress);
    setPaused(true);
  }, [breath, cycleProgress]);

  const resumeSession = () => {
    if (!pausedAtMsRef.current) return;
    // Shift the session's start by the paused stretch so the shared clock
    // resumes mid-phase instead of jumping ahead.
    startMsRef.current += Date.now() - pausedAtMsRef.current;
    pausedAtMsRef.current = 0;
    // Force the next tick to re-drive the animation from the mid-phase point.
    phaseIndexRef.current = -1;
    setPaused(false);
  };

  useEffect(() => {
    if (screenPhase !== "active" || paused || !resolved) return;

    const tick = () => {
      const elapsed = elapsedNow();
      const state = scheduleStateAt(resolved.phases, selectedCycles, elapsed);
      setSecondsLeft(state.totalRemainingSeconds);
      setPhaseSecondsLeft(state.phaseRemainingSeconds);

      if (state.done) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        void handleFinish();
        return;
      }
      if (state.phase && state.phaseIndex !== phaseIndexRef.current) {
        phaseIndexRef.current = state.phaseIndex;
        const idxInCycle = state.phaseIndex % resolved.phases.length;
        setCurrentPhase(state.phase);
        setCurrentCycle(state.cycleNumber);
        setPhaseIdxInCycle(idxInCycle);
        animateForPhase(state.phase, idxInCycle, elapsed % cycleSeconds(resolved.phases));
        // Announce the phase by name - never the per-second countdown. Guarded
        // separately from phaseIndexRef so a resume (which re-drives the
        // animation by resetting that ref) does not re-announce the same phase.
        if (announcedIndexRef.current !== state.phaseIndex) {
          announcedIndexRef.current = state.phaseIndex;
          const phaseName = t(`breathing.phases.${state.phase.label}`);
          announceMessage(
            idxInCycle === 0
              ? `${t("breathing.cycleProgress", { current: state.cycleNumber, total: selectedCycles })}. ${phaseName}`
              : phaseName,
          );
        }
      }
    };

    const id = setInterval(tick, TICK_MS);
    intervalRef.current = id;
    tick(); // paint the first phase immediately

    return () => {
      clearInterval(id);
      intervalRef.current = null;
    };
    // Interval reads time via refs; re-subscribing each tick would drift the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenPhase, paused, resolved]);

  // Shell B's Escape (#1256) leaves through `router.replace`, so it lands here
  // with the OS back gesture and the web back button - every uninvited exit
  // passes this guard. Mid-session they pause the clock and ask - a calm
  // finish-or-continue, never a silent discard (#777). Setup has nothing to
  // lose and preroll hasn't breathed yet; both let the exit through.
  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      if (screenPhase !== "active" || finishingRef.current) return;
      event.preventDefault();
      pauseSession();
      setExitDialogOpen(true);
    });
  }, [navigation, screenPhase, pauseSession]);

  // Navigating away ends and DISCARDS an in-progress session (no save). Runs on
  // blur + unmount - the backstop behind the beforeRemove confirmation above,
  // for exits that never pass through this screen's navigator (sign-out, deep
  // links replacing the whole stack).
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (prerollRef.current) {
          clearTimeout(prerollRef.current);
          prerollRef.current = null;
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        finishingRef.current = false;
        phaseIndexRef.current = -1;
        announcedIndexRef.current = -1;
        startMsRef.current = 0;
        pausedAtMsRef.current = 0;
        cancelAnimation(breath);
        cancelAnimation(cycleProgress);
        breath.set(0);
        cycleProgress.set(0);
        setScreenPhase("intro"); // also stops audio (useBreathingAudio active → false)
        setPaused(false);
        setExitDialogOpen(false);
        setCurrentPhase(null);
        setPhaseIdxInCycle(-1);
        setCurrentCycle(0);
        setSecondsLeft(0);
        setPhaseSecondsLeft(0);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("breathing.title")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!resolved || notFound) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center p-6">
          <Text variant="h2">{t("breathing.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const title = resolved.i18nSlug
    ? t(`breathing.exercises.${resolved.i18nSlug}.title`)
    : resolved.title;
  const description = resolved.i18nSlug
    ? t(`breathing.exercises.${resolved.i18nSlug}.shortDescription`)
    : null;

  const beginActive = () => {
    if (prerollRef.current) {
      clearTimeout(prerollRef.current);
      prerollRef.current = null;
    }
    phaseIndexRef.current = -1;
    announcedIndexRef.current = -1;
    pausedAtMsRef.current = 0;
    startMsRef.current = Date.now();
    breath.set(0);
    cycleProgress.set(0);
    setPaused(false);
    setSecondsLeft(totalSeconds(resolved.phases, selectedCycles));
    setScreenPhase("active");
  };

  const handleStart = () => {
    if (!selectedCycles) return;
    // Remember what was actually run so the session reopens on it next time.
    if (prefs?.lastBreathingPatternId !== patternId)
      patchPrefs({ lastBreathingPatternId: patternId });
    // Guided voice sounds get a short spoken intro before the cycle starts.
    const breathSound = breathSoundLookup[audioPrefs.breathSoundId];
    if (breathSound?.introAsset) {
      setScreenPhase("preroll");
      playIntroCue(breathSound.introAsset, audioPrefs.breathVolume);
      prerollRef.current = setTimeout(
        beginActive,
        (breathSound.introMs ?? 3000) + POST_INTRO_PAUSE_MS,
      );
    } else {
      beginActive();
    }
  };

  // Shared HH:MM:SS-aware formatter: a long session (> 1h) must render "01:06:40",
  // not the hand-rolled "66:40" a bare M:SS would produce.
  const timeDisplay = formatClock(secondsLeft);
  const secondsPerCycle = cycleSeconds(resolved.phases);

  if (screenPhase !== "intro") {
    const nextPhase =
      phaseIdxInCycle >= 0 ? resolved.phases[(phaseIdxInCycle + 1) % resolved.phases.length] : null;
    return (
      <FocusSessionShell
        eyebrow={title}
        trailing={
          screenPhase === "active" && currentCycle > 0
            ? `${t("breathing.cycleProgress", { current: currentCycle, total: selectedCycles })} · ${t("breathing.session.timeLeft", { time: timeDisplay })}`
            : undefined
        }
      >
        <View className="grow items-center justify-center gap-7 py-8">
          <BreathingPacer
            activePhaseIndex={phaseIdxInCycle}
            breath={breath}
            colors={pacer}
            cycleProgress={cycleProgress}
            phaseStartFractions={phaseFractions}
            size={PACER_SIZE}
          />
          <View className="items-center gap-1.5">
            {/* The phase name is the polite live region; the countdown line is
                deliberately NOT one, so web screen readers hear each phase once
                rather than every second (native announces via announceMessage). */}
            <Text
              className="text-center text-[28px] font-bold tracking-tight"
              {...politeLiveRegionProps()}
            >
              {screenPhase === "preroll"
                ? t("breathing.getReady")
                : currentPhase
                  ? t(`breathing.phases.${currentPhase.label}`)
                  : " "}
            </Text>
            {/* The timing line carries the same information the circle animates -
                the non-visual (and reduced-motion) carrier of the beat. */}
            <Text className="text-center text-sm tabular-nums" style={{ color: pacer.timingInk }}>
              {paused
                ? t("breathing.session.paused")
                : screenPhase === "active" && currentPhase && nextPhase
                  ? t("breathing.session.then", {
                      seconds: phaseSecondsLeft,
                      phase: t(`breathing.phases.${nextPhase.label}`),
                    })
                  : " "}
            </Text>
          </View>
        </View>

        <View className="gap-4 border-t border-border pt-5">
          <VolumeRail
            accessibilityLabel={t("breathing.sounds.breathVolume")}
            icon="record-voice-over"
            label={t("breathing.sounds.breathLabel")}
            onChange={setBreathVolumeOverride}
            onCommit={(v) => patchPrefs({ breathVolume: v })}
            value={breathVolume}
          />
          <VolumeRail
            accessibilityLabel={t("breathing.sounds.ambientVolume")}
            icon="graphic-eq"
            label={t("breathing.sounds.ambientLabel")}
            onChange={setAmbientVolumeOverride}
            onCommit={(v) => patchPrefs({ ambientVolume: v })}
            value={ambientVolume}
          />
        </View>

        {/* Controls exist only once the clock does. During the preroll there is
            nothing to pause and nothing true to save - a Finish here would
            measure elapsed time from a start that never happened and record a
            session as fully completed (Codex P1 on #848). The back gesture
            still exits a preroll freely, and it lasts ~4s. */}
        {screenPhase === "active" ? (
          <View className="flex-row items-center justify-center gap-2 pb-1 pt-6">
            <Button onPress={paused ? resumeSession : pauseSession} variant="outline">
              <Icon
                className="size-[18px] text-foreground"
                name={paused ? "play-arrow" : "pause"}
              />
              <Text>{paused ? t("breathing.session.resume") : t("breathing.session.pause")}</Text>
            </Button>
            <Button
              disabled={saveMutation.isPending}
              onPress={() => void handleFinish()}
              variant="ghost"
            >
              <Text>{t("breathing.finishEarly")}</Text>
            </Button>
          </View>
        ) : null}

        <ConfirmDialog
          cancelLabel={t("breathing.session.exit.cancel")}
          confirmLabel={t("breathing.session.exit.confirm")}
          destructive={false}
          isPending={saveMutation.isPending}
          message={t("breathing.session.exit.message")}
          onCancel={() => {
            setExitDialogOpen(false);
            resumeSession();
          }}
          onConfirm={() => {
            setExitDialogOpen(false);
            void handleFinish();
          }}
          title={t("breathing.session.exit.title")}
          visible={exitDialogOpen}
        />
      </FocusSessionShell>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Setup gets the 48px trail bar (design `4b`); the live session runs on
          the focus shell decided on #777 and built above. */}
      <ScreenTopBar leading="back" />
      <ScrollView contentContainerClassName="grow p-6">
        {/* The 620px form column the shell decision assigns to setup/form
            screens (#690) — the setup state just never took it (#873); the 4d
            editor in breathing-exercise-editor-screen.tsx always had it. */}
        <View className={cn(FORM_COLUMN, "grow gap-6")} testID="breathing-setup-column">
          <SoundsSheet visible={soundsOpen} onDismiss={() => setSoundsOpen(false)} />

          {/* A wrapping run of tabs, not a horizontal scroller: an
              off-screen pattern in a scroller is a pattern the user never
              learns exists, and the set is small enough to wrap. */}
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t("breathing.choosePattern")}
            className="flex-row flex-wrap gap-2"
            role="radiogroup"
            testID="breathing-pattern-tabs"
          >
            {breathingPatterns.map((p) => (
              <PatternTab
                key={p.slug}
                label={t(`breathing.exercises.${p.slug}.title`)}
                active={patternId === p.slug}
                onPress={() => selectPattern(p.slug)}
              />
            ))}
            {(customExercises ?? []).map((e) => (
              <PatternTab
                key={e.id}
                label={e.name}
                active={patternId === e.id}
                onPress={() => selectPattern(e.id)}
              />
            ))}
          </View>

          <View className="gap-2.5">
            <Text className="text-[26px] font-bold tracking-tight">{title}</Text>
            {description ? (
              <Text variant="muted" className="text-sm leading-relaxed">
                {description}
              </Text>
            ) : null}
          </View>

          <View className="gap-3 border-y border-border py-5">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {t("breathing.setup.eachCycle")}
            </Text>
            {/* `resolved.phases` already drops zero-length phases for custom
                patterns, and the bar drops them again for built-ins - so
                coherent breathing draws two segments and two labels, not
                four with two invisible ones. */}
            <PhaseTimingBar phases={resolved.phases} showLabels />
          </View>

          <View className="gap-3">
            <View className="flex-row items-baseline justify-between gap-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {t("breathing.setup.howLong")}
              </Text>
              <Text variant="muted" className="shrink-0 text-[12.5px] tabular-nums">
                {t("breathing.cycles", { count: selectedCycles })} ·{" "}
                {formatClock(totalSeconds(resolved.phases, selectedCycles))}
              </Text>
            </View>
            <SessionLengthButtons
              secondsPerCycle={secondsPerCycle}
              selectedCycles={selectedCycles}
              onSelect={changeCycles}
            />
          </View>

          {/* Two rows that OPEN the existing sounds sheet rather than
              replacing it. The sheet stays the sound PICKER; the live volume
              rails moved onto the session screen itself (design `4c`). */}
          <View>
            <SoundRow
              icon="record-voice-over"
              label={t("breathing.setup.voiceGuidance")}
              // The catalog entry owns its label key - `none` lives at
              // `sounds.none`, not under `sounds.breath.*`, so building the
              // key from the id here would render a raw key string for the
              // default selection.
              value={
                breathSoundLookup[audioPrefs.breathSoundId]
                  ? t(breathSoundLookup[audioPrefs.breathSoundId].labelKey)
                  : t("breathing.setup.none")
              }
              onPress={() => setSoundsOpen(true)}
            />
            <SoundRow
              icon="graphic-eq"
              label={t("breathing.setup.ambientSound")}
              value={
                ambientSoundLookup[audioPrefs.ambientSoundId]
                  ? t(ambientSoundLookup[audioPrefs.ambientSoundId].labelKey)
                  : t("breathing.setup.none")
              }
              onPress={() => setSoundsOpen(true)}
              last
            />
          </View>

          <Button disabled={!selectedCycles} onPress={handleStart}>
            <Text>{t("breathing.start")}</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * One volume lane as design `4c` draws it: icon, a fixed label column, the
 * track, and the current percentage - a restyle of the always-visible sliders
 * the session screen has carried since the sounds sheet gave up volume
 * (sounds-sheet.tsx keeps selection; these keep loudness).
 *
 * At the 360dp floor the fixed columns (18px icon + 78px label + 34px readout
 * + three 14px gaps) leave the track ~140px, comfortably above the 18px thumb.
 */
function VolumeRail({
  icon,
  label,
  value,
  onChange,
  onCommit,
  accessibilityLabel,
}: {
  icon: MaterialIconName;
  label: string;
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  accessibilityLabel: string;
}) {
  return (
    <View className="flex-row items-center gap-3.5">
      <Icon name={icon} size={18} className="text-muted-foreground" />
      <Text variant="muted" className="w-[78px] text-[13px]" numberOfLines={1}>
        {label}
      </Text>
      <View className="flex-1">
        <VolumeSlider
          accessibilityLabel={accessibilityLabel}
          onChange={onChange}
          onCommit={onCommit}
          value={value}
        />
      </View>
      <Text variant="muted" className="w-[34px] text-right text-xs tabular-nums">
        {Math.round(value * 100)}%
      </Text>
    </View>
  );
}

/**
 * One pattern tab.
 *
 * Selected is the shared chip treatment - `border-primary bg-primary/10` behind
 * `text-primary-ink`, the same shape as selectable-chip.tsx and meditation's
 * ChoiceRow - not the pattern's own colour: #926 moved the setup controls onto
 * theme tokens, and the pattern's colour lives in its row's dot and the live
 * pacer. `text-primary-ink`, never `text-primary`: the latter on `bg-primary/10`
 * is the shape #691 named a regression and #368 measured at 3.81:1.
 *
 * Every stop rides a utility class rather than a colour literal:
 * test/theme-token-sync.test.ts holds this file to zero such literals, because
 * the pacer once hardcoded its triple and a palette retune skipped the screen's
 * central graphic (#310).
 */
function PatternTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      aria-checked={active}
      accessibilityLabel={label}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      // Selection shifts border, fill AND weight together - a 10% tint is not a
      // distinction on its own (#691), so colour is never the only cue.
      className={cn(
        "rounded-full border px-4 py-2",
        active ? "border-primary bg-primary/10" : "border-border",
      )}
      role="radio"
    >
      <Text
        className={cn("text-[13px]", active && "font-semibold text-primary-ink")}
        numberOfLines={1}
        variant={active ? undefined : "muted"}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A hairline row that shows the current sound and opens the sounds sheet. */
function SoundRow({
  icon,
  label,
  value,
  onPress,
  last = false,
}: {
  icon: MaterialIconName;
  label: string;
  value: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3.5 border-t border-border px-0.5 py-3.5 active:bg-accent/40",
        last && "border-b",
      )}
      role="button"
    >
      <Icon name={icon} size={18} className="text-muted-foreground" />
      <Text className="flex-1 text-sm">{label}</Text>
      <Text variant="muted" className="shrink-0 text-[13px]">
        {value}
      </Text>
      <Icon name="chevron-right" size={18} className="text-muted-foreground/60" />
    </Pressable>
  );
}
