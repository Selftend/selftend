import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pressable, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { Button } from "@/src/components/react-native-reusables/button";
import { Label } from "@/src/components/react-native-reusables/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { LoadingState } from "@/src/components/app/screen-state";
import { breathingPatterns } from "@/src/constants/breathing";
import type { BreathingPhase } from "@/src/constants/breathing";
import { CYCLES_MAX } from "@/src/features/breathing/exercise-schema";
import {
  totalSeconds,
  formatClock,
  elapsedMinutes,
  cycleSeconds,
} from "@/src/features/breathing/cycle-math";
import { scheduleStateAt } from "@/src/features/breathing/schedule";
import { useResolvedExercise } from "@/src/features/breathing/resolve-exercise";
import { useBreathingExercises } from "@/src/features/breathing/exercises-queries";
import { SoundsSheet } from "@/src/features/breathing/sounds-sheet";
import { VolumeSlider } from "@/src/components/app/volume-slider";
import { breathSoundLookup } from "@/src/constants/breathing-sounds";
import { playIntroCue, useBreathingAudio } from "@/src/features/breathing/use-breathing-audio";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useAppColorScheme } from "@/src/lib/color-scheme";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useSaveBreathingSession } from "@/src/features/breathing/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

type ScreenPhase = "intro" | "preroll" | "active";

const CIRCLE_MIN = 80;
const CIRCLE_MAX = 160;
const TICK_MS = 250;
const DEFAULT_PATTERN = "box-breathing";
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

  // The active pattern: the ?pattern param wins, otherwise the server-remembered last one,
  // otherwise a sensible default. `patternTouched` stops the remembered-pattern effect from
  // overriding an explicit choice.
  const [patternId, setPatternId] = useState<string>(() => patternParam || DEFAULT_PATTERN);
  const patternTouchedRef = useRef(Boolean(patternParam));
  const { resolved, isLoading, notFound } = useResolvedExercise(patternId);

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>("intro");
  const [selectedCycles, setSelectedCycles] = useState<number>(0);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase | null>(null);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);
  const [soundsOpen, setSoundsOpen] = useState(false);

  // Volume is frontend-authoritative (instant audio); the DB only stores the last value so it
  // restores next session. Hydrated from prefs once, then owned locally.
  const [breathVolume, setBreathVolume] = useState(0.7);
  const [ambientVolume, setAmbientVolume] = useState(0.5);
  const hydratedRef = useRef(false);

  const phaseIndexRef = useRef(-1);
  const startMsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishingRef = useRef(false);
  const prerollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const circleSize = useSharedValue(CIRCLE_MIN);
  const saveMutation = useSaveBreathingSession(user?.id ?? null);
  const audioPrefs = mergeUserPreferences(prefs, {});

  const patchPrefs = (p: PrefsPatch) => {
    if (!user?.id) return;
    void updatePrefs.mutateAsync(mergeUserPreferences(prefs, p));
  };

  const selectPattern = (id: string) => {
    if (id === patternId) return;
    patternTouchedRef.current = true;
    setPatternId(id);
    patchPrefs({ lastBreathingPatternId: id }); // cycles are global - keep them across patterns
  };

  // Cycle count is global: change it locally and persist for next session.
  const changeCycles = (next: number) => {
    setSelectedCycles(next);
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

  const colorScheme = useAppColorScheme();
  const aqua = colorScheme === "dark" ? "196, 58%, 62%" : "196, 52%, 45%";

  const circleStyle = useAnimatedStyle(() => ({
    width: circleSize.value,
    height: circleSize.value,
    borderRadius: circleSize.value / 2,
    backgroundColor: `hsla(${aqua}, 0.22)`,
    borderWidth: 2,
    borderColor: `hsl(${aqua})`,
  }));

  // The outer ring is a constant size; only the inner circle scales with the breath.
  const OUTER_SIZE = CIRCLE_MAX * 1.5;
  const outerStyle = {
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    borderRadius: OUTER_SIZE / 2,
    backgroundColor: `hsla(${aqua}, 0.1)`,
    borderWidth: 2,
    borderColor: `hsla(${aqua}, 0.3)`,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  // Adopt the server-remembered pattern once prefs load (unless the user picked one / passed a param).
  useEffect(() => {
    if (patternTouchedRef.current || patternParam) return;
    const last = prefs?.lastBreathingPatternId;
    if (last && last !== patternId) setPatternId(last);
  }, [prefs, patternParam, patternId]);

  // Hydrate frontend-owned values (volumes + global cycles) from prefs once they load.
  useEffect(() => {
    if (hydratedRef.current || !prefs) return;
    hydratedRef.current = true;
    setBreathVolume(prefs.breathVolume);
    setAmbientVolume(prefs.ambientVolume);
    if (prefs.breathingCycles) setSelectedCycles(prefs.breathingCycles);
  }, [prefs]);

  // If no global cycle count is saved yet, fall back to the pattern's default once it resolves.
  useEffect(() => {
    if (resolved && selectedCycles === 0 && !prefs?.breathingCycles) {
      setSelectedCycles(resolved.defaultCycles);
    }
  }, [resolved, selectedCycles, prefs]);

  const animateForPhase = (phase: BreathingPhase) => {
    const toSize =
      phase.label === "inhale"
        ? CIRCLE_MAX
        : phase.label === "exhale"
          ? CIRCLE_MIN
          : circleSize.value;
    circleSize.value = withTiming(toSize, {
      duration: phase.durationSeconds * 1000,
      easing: Easing.inOut(Easing.ease),
    });
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
        circleSize.value = CIRCLE_MIN;
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
  const benefit = resolved.i18nSlug ? t(`breathing.exercises.${resolved.i18nSlug}.benefit`) : null;

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

  const handleFinish = async () => {
    if (!selectedCycles) return;
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

  // Shared HH:MM:SS-aware formatter: a long session (> 1h) must render "01:06:40",
  // not the hand-rolled "66:40" a bare M:SS would produce.
  const timeDisplay = formatClock(secondsLeft);
  const phaseLabelKey = currentPhase ? (`breathing.phases.${currentPhase.label}` as const) : null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
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

          <SoundsSheet visible={soundsOpen} onDismiss={() => setSoundsOpen(false)} />

          {screenPhase === "intro" ? (
            <>
              <View className="gap-2">
                <Label>{t("breathing.choosePattern")}</Label>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2 pr-4"
                >
                  {breathingPatterns.map((p) => (
                    <Button
                      key={p.slug}
                      size="sm"
                      variant={patternId === p.slug ? "default" : "outline"}
                      onPress={() => selectPattern(p.slug)}
                    >
                      <Text>{t(`breathing.exercises.${p.slug}.title`)}</Text>
                    </Button>
                  ))}
                  {(customExercises ?? []).map((e) => (
                    <Button
                      key={e.id}
                      size="sm"
                      variant={patternId === e.id ? "default" : "outline"}
                      onPress={() => selectPattern(e.id)}
                    >
                      <Text>{e.name}</Text>
                    </Button>
                  ))}
                </ScrollView>
              </View>

              <Card>
                {benefit ? (
                  <CardHeader>
                    <CardTitle>{benefit}</CardTitle>
                  </CardHeader>
                ) : null}
                <CardContent>
                  <View className="gap-1">
                    {resolved.phases.map((phase, i) => (
                      <Text key={i} variant="muted">
                        {t(`breathing.phases.${phase.label}`)} - {phase.durationSeconds}s
                      </Text>
                    ))}
                  </View>
                </CardContent>
              </Card>

              <View className="gap-3">
                <Label>{t("breathing.chooseCycles")}</Label>
                <View className="flex-row items-center justify-center gap-6">
                  <Button
                    variant="outline"
                    accessibilityLabel={t("breathing.decreaseCycles")}
                    onPress={() => changeCycles(Math.max(1, selectedCycles - 1))}
                  >
                    <Text className="text-lg">−</Text>
                  </Button>
                  <View className="items-center">
                    <Text className="text-3xl font-bold tabular-nums">
                      {t("breathing.cycles", { count: selectedCycles })}
                    </Text>
                    <Text variant="muted" className="text-sm tabular-nums">
                      {t("breathing.totalTimeLabel")} ·{" "}
                      {formatClock(totalSeconds(resolved.phases, selectedCycles))}
                    </Text>
                  </View>
                  <Button
                    variant="outline"
                    accessibilityLabel={t("breathing.increaseCycles")}
                    onPress={() => changeCycles(Math.min(CYCLES_MAX, selectedCycles + 1))}
                  >
                    <Text className="text-lg">+</Text>
                  </Button>
                </View>
              </View>

              <Button disabled={!selectedCycles} onPress={handleStart}>
                <Text>{t("breathing.start")}</Text>
              </Button>
            </>
          ) : null}

          {screenPhase === "preroll" || screenPhase === "active" ? (
            <View className="gap-6 items-center">
              <View className="w-full flex-row items-stretch justify-center gap-3">
                <View className="items-center justify-center gap-2" style={{ width: 44 }}>
                  <View style={{ height: 180 }}>
                    <VolumeSlider
                      orientation="vertical"
                      value={breathVolume}
                      onChange={setBreathVolume}
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
                      onChange={setAmbientVolume}
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
