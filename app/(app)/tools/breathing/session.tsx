import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pressable, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { LoadingState } from "@/src/components/app/screen-state";
import { breathingPatterns } from "@/src/constants/breathing";
import type { BreathingPhase } from "@/src/constants/breathing";
import { PhaseTimingBar } from "@/src/features/breathing/phase-timing-bar";
import { SessionLengthButtons } from "@/src/features/breathing/session-length-buttons";
import { breathingChipColors } from "@/src/features/breathing/exercise-colors";
import type { BreathingExerciseColor } from "@/src/features/breathing/exercise-types";
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
import { DEFAULT_INTERACTIVE_HIT_SLOP, useReduceMotionEnabled } from "@/src/lib/accessibility";
import { useSaveBreathingSession } from "@/src/features/breathing/queries";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

type ScreenPhase = "intro" | "preroll" | "active";

const CIRCLE_MIN = 80;
const CIRCLE_MAX = 160;
// Reduced-motion pacer: instead of animating the inner circle's size, each
// phase steps its opacity (both holds share the mid step). The phase label and
// countdown below the pacer carry the same information as text.
const PHASE_OPACITY: Record<BreathingPhase["label"], number> = {
  inhale: 1,
  hold: 0.7,
  exhale: 0.4,
  holdOut: 0.7,
};
const TICK_MS = 250;
const DEFAULT_PATTERN = "box-breathing";
// Pre-resolved fallback for when a remembered pattern no longer exists; a
// module constant so its identity is stable across renders (the ticking
// effect keys on `resolved`).
const DEFAULT_RESOLVED = resolveBuiltin(DEFAULT_PATTERN);
// A beat of silence after the spoken intro before the breathing sequence starts.
const POST_INTRO_PAUSE_MS = 1000;

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
  const [currentCycle, setCurrentCycle] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase | null>(null);
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
  const startMsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishingRef = useRef(false);
  const prerollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reduceMotionEnabled = useReduceMotionEnabled();
  const circleSize = useSharedValue(CIRCLE_MIN);
  const innerOpacity = useSharedValue(1);
  const saveMutation = useSaveBreathingSession(user?.id ?? null);
  const audioPrefs = mergeUserPreferences(prefs, {});

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
    active: screenPhase === "active",
    phaseLabel: currentPhase?.label ?? null,
    breathSoundId: audioPrefs.breathSoundId,
    ambientSoundId: audioPrefs.ambientSoundId,
    breathVolume,
    ambientVolume,
  });

  const colorScheme = useColorSchemeName();
  const roomStyle = useRoomStyle("aqua");
  // Identity-stable per scheme: the countdown rerenders this screen about once a
  // second during a session, and `circleStyle`'s worklet captures `pacer`. A fresh
  // object each render reads as a changed closure dependency, so Reanimated tears
  // down and restarts the style mapper mid-animation - exactly when the pacer
  // circle must not stutter.
  const isDarkScheme = colorScheme === "dark";
  const pacer = useMemo(() => pacerColors(isDarkScheme), [isDarkScheme]);

  const circleStyle = useAnimatedStyle(() => ({
    width: circleSize.get(),
    height: circleSize.get(),
    borderRadius: circleSize.get() / 2,
    // Stays at 1 unless reduced motion steps it per phase in animateForPhase.
    opacity: innerOpacity.get(),
    backgroundColor: pacer.innerFill,
    borderWidth: 2,
    borderColor: pacer.innerBorder,
  }));

  // The outer ring is a constant size; only the inner circle scales with the breath.
  const OUTER_SIZE = CIRCLE_MAX * 1.5;
  const outerStyle = {
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    borderRadius: OUTER_SIZE / 2,
    backgroundColor: pacer.outerFill,
    borderWidth: 2,
    borderColor: pacer.outerBorder,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  // When the remembered pattern falls back to the default, also clear the
  // stale remembered id (best-effort) so every param-less entry point (home
  // button, widget, suggestions) keeps working next session.
  useEffect(() => {
    if (!fallbackToDefault) return;
    patchPrefs({ lastBreathingPatternId: DEFAULT_PATTERN });
    // patchPrefs reads latest prefs/user via closure; deps kept to the resolution signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackToDefault]);

  const animateForPhase = (phase: BreathingPhase) => {
    const toSize =
      phase.label === "inhale"
        ? CIRCLE_MAX
        : phase.label === "exhale"
          ? CIRCLE_MIN
          : circleSize.get();
    if (reduceMotionEnabled) {
      // Reduced motion: no withTiming - jump straight to the phase's size and
      // step the inner circle's opacity so each phase stays distinguishable.
      circleSize.set(toSize);
      innerOpacity.set(PHASE_OPACITY[phase.label]);
      return;
    }
    circleSize.set(
      withTiming(toSize, {
        duration: phase.durationSeconds * 1000,
        easing: Easing.inOut(Easing.ease),
      }),
    );
  };

  const handleFinish = async () => {
    // Declared above the ticking effect that calls it (compiler lint: no
    // use-before-declaration), so `resolved` isn't narrowed yet — every caller
    // runs after the not-found guard, making this a type-level guard only.
    if (!resolved || !selectedCycles) return;
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const planned = totalSeconds(resolved.phases, selectedCycles);
    const elapsed = (Date.now() - startMsRef.current) / 1000;
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

  useEffect(() => {
    if (screenPhase !== "active" || !resolved) return;

    const tick = () => {
      const elapsed = (Date.now() - startMsRef.current) / 1000;
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
        setCurrentPhase(state.phase);
        setCurrentCycle(state.cycleNumber);
        animateForPhase(state.phase);
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
  }, [screenPhase, resolved]);

  // Navigating away ends and DISCARDS an in-progress session (no save). Runs on blur + unmount.
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
        circleSize.set(CIRCLE_MIN);
        innerOpacity.set(1);
        setScreenPhase("intro"); // also stops audio (useBreathingAudio active → false)
        setCurrentPhase(null);
        setCurrentCycle(0);
        setSecondsLeft(0);
        setPhaseSecondsLeft(0);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={roomStyle}>
        <View className="flex-1 justify-center">
          <LoadingState title={t("breathing.title")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!resolved || notFound) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={roomStyle}>
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
    startMsRef.current = Date.now();
    setSecondsLeft(totalSeconds(resolved.phases, selectedCycles));
    setScreenPhase("active");
  };

  const handleStart = () => {
    if (!selectedCycles) return;
    // Remember what was actually run so the session reopens on it next time.
    if (prefs?.lastBreathingPatternId !== patternId)
      patchPrefs({ lastBreathingPatternId: patternId });
    // Guided voice sounds get a short spoken intro before the cycle starts.
    const breath = breathSoundLookup[audioPrefs.breathSoundId];
    if (breath?.introAsset) {
      setScreenPhase("preroll");
      playIntroCue(breath.introAsset, audioPrefs.breathVolume);
      prerollRef.current = setTimeout(beginActive, (breath.introMs ?? 3000) + POST_INTRO_PAUSE_MS);
    } else {
      beginActive();
    }
  };

  // Shared HH:MM:SS-aware formatter: a long session (> 1h) must render "01:06:40",
  // not the hand-rolled "66:40" a bare M:SS would produce.
  const timeDisplay = formatClock(secondsLeft);
  const phaseLabelKey = currentPhase ? (`breathing.phases.${currentPhase.label}` as const) : null;

  const secondsPerCycle = cycleSeconds(resolved.phases);
  const accent = resolved.color;

  return (
    <SafeAreaView className="flex-1 bg-background" style={roomStyle}>
      {/* Setup gets the 48px trail bar (design `4b`); the pacer keeps the header
          it has until #779 gives it the session shell decided on #777. */}
      {screenPhase === "intro" ? <ScreenTopBar leading="back" /> : null}
      <ScrollView contentContainerClassName="grow p-6">
        <View className="grow gap-6">
          {screenPhase === "intro" ? null : (
            <View className="gap-2">
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-1">
                  <ScreenHeader title={title} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("breathing.sounds.open")}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => setSoundsOpen(true)}
                  className="p-2"
                >
                  <Icon name="settings" className="size-6 text-muted-foreground" />
                </Pressable>
              </View>
              {description ? <Text variant="muted">{description}</Text> : null}
            </View>
          )}

          <SoundsSheet visible={soundsOpen} onDismiss={() => setSoundsOpen(false)} />

          {screenPhase === "intro" ? (
            <>
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
                    color={p.color}
                    active={patternId === p.slug}
                    onPress={() => selectPattern(p.slug)}
                  />
                ))}
                {(customExercises ?? []).map((e) => (
                  <PatternTab
                    key={e.id}
                    label={e.name}
                    color={e.color}
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
                <PhaseTimingBar phases={resolved.phases} color={accent} showLabels />
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
                  accent={accent}
                />
              </View>

              {/* Two rows that OPEN the existing sounds sheet rather than
                  replacing it. The design's caption says sounds "fold in instead
                  of a separate sheet", but the sheet also carries the two volume
                  rails, and the redesign moves those onto the session screen
                  (`4c`), which is #779's ticket and blocked on #777. Deleting the
                  sheet now would strand the volume controls between two tickets,
                  so the rows surface the current values and the sheet stays. */}
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
            </>
          ) : null}

          {screenPhase === "preroll" || screenPhase === "active" ? (
            // grow + justify-center keeps the pacer vertically centered in the
            // space under the header instead of hugging the top (#612 capture QA).
            <View className="grow gap-6 items-center justify-center">
              <View className="w-full flex-row items-stretch justify-center gap-3">
                <View className="items-center justify-center gap-2" style={{ width: 44 }}>
                  <View style={{ height: 180 }}>
                    <VolumeSlider
                      orientation="vertical"
                      value={breathVolume}
                      onChange={setBreathVolumeOverride}
                      onCommit={(v) => patchPrefs({ breathVolume: v })}
                      accessibilityLabel={t("breathing.sounds.breathVolume")}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("breathing.sounds.pickBreath")}
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={() => setSoundsOpen(true)}
                    className="p-1"
                  >
                    <Icon name="volume-up" className="size-5 text-muted-foreground" />
                  </Pressable>
                </View>

                <View
                  className="items-center justify-center"
                  style={{ height: CIRCLE_MAX * 1.5 + 40 }}
                >
                  <View style={outerStyle}>
                    <Animated.View style={circleStyle} />
                  </View>
                </View>

                <View className="items-center justify-center gap-2" style={{ width: 44 }}>
                  <View style={{ height: 180 }}>
                    <VolumeSlider
                      orientation="vertical"
                      value={ambientVolume}
                      onChange={setAmbientVolumeOverride}
                      onCommit={(v) => patchPrefs({ ambientVolume: v })}
                      accessibilityLabel={t("breathing.sounds.ambientVolume")}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("breathing.sounds.pickAmbient")}
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={() => setSoundsOpen(true)}
                    className="p-1"
                  >
                    <Icon name="music-note" className="size-5 text-muted-foreground" />
                  </Pressable>
                </View>
              </View>

              {screenPhase === "preroll" ? (
                <Text className="text-2xl font-semibold text-center">
                  {t("breathing.getReady")}
                </Text>
              ) : (
                <>
                  {phaseLabelKey ? (
                    <Text className="text-2xl font-semibold text-center">{t(phaseLabelKey)}</Text>
                  ) : null}

                  <Text variant="muted" className="text-center text-lg">
                    {phaseSecondsLeft}s
                  </Text>

                  <Text variant="muted" className="text-center">
                    {t("breathing.cycleProgress", { current: currentCycle, total: selectedCycles })}
                  </Text>

                  <Text variant="muted" className="text-center">
                    {timeDisplay}
                  </Text>

                  <Button
                    onPress={() => void handleFinish()}
                    variant="ghost"
                    disabled={saveMutation.isPending}
                  >
                    <Text>{t("breathing.finishEarly")}</Text>
                  </Button>
                </>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * One pattern tab.
 *
 * ⚠️ Selected is `chip.fill` behind `chip.ink`, NOT the design's raw aqua accent
 * on an `aqua/0.14` fill - that is the shape #691 named a regression and #368
 * measured at 3.81:1. `chip.ink` is tuned per hue in src/lib/hue-chip.ts
 * precisely so ink-on-fill clears AA in both schemes.
 *
 * The hue is the PATTERN's own colour, so the tab, the timing bar and the
 * length buttons all agree on what colour "this pattern" is - and the hue
 * encodes which pattern rather than which tool, which is the distinction #691
 * draws.
 */
function PatternTab({
  label,
  color,
  active,
  onPress,
}: {
  label: string;
  color: BreathingExerciseColor;
  active: boolean;
  onPress: () => void;
}) {
  const scheme = useColorSchemeName();
  const chip = breathingChipColors(color, scheme);
  return (
    <Pressable
      accessibilityRole="radio"
      aria-checked={active}
      accessibilityLabel={label}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      // The resting border rides `border-border` as a class rather than a raw
      // colour literal: test/theme-token-sync.test.ts holds this file to zero
      // such literals, because the pacer once hardcoded its triple and a palette
      // retune skipped the screen's central graphic (#310). Only the active
      // state needs a computed colour, and it comes from the chip recipe.
      className="rounded-full border border-border px-4 py-2"
      role="radio"
      style={active ? { backgroundColor: chip.fill, borderColor: chip.ink } : undefined}
    >
      <Text
        className="text-[13px] font-semibold"
        numberOfLines={1}
        style={active ? { color: chip.ink } : undefined}
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
