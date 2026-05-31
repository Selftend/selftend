import { router, useLocalSearchParams } from "expo-router";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";

import { Button } from "@/src/components/react-native-reusables/button";
import { Label } from "@/src/components/react-native-reusables/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { breathingLookup } from "@/src/constants/breathing";
import type { BreathingPhase } from "@/src/constants/breathing";
import { useAppColorScheme } from "@/src/lib/color-scheme";
import { useSaveBreathingSession } from "@/src/features/breathing/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

type ScreenPhase = "intro" | "active";

const CIRCLE_MIN = 80;
const CIRCLE_MAX = 160;

export default function BreathingExerciseScreen() {
  const { t } = useTranslation("cbt");
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);

  const pattern = slug ? breathingLookup[slug] : undefined;

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>("intro");
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase | null>(null);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);

  const phaseIndexRef = useRef(0);
  const phaseSecondsRef = useRef(0);
  const totalSecondsRef = useRef(0);

  const circleSize = useSharedValue(CIRCLE_MIN);
  const saveMutation = useSaveBreathingSession(user?.id ?? null);

  // Colours live in the animated style (not className) because NativeWind class
  // styles get dropped on an Animated.View that carries an animated style. Mirrors
  // the --aqua token for light/dark.
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

  const haloStyle = useAnimatedStyle(() => {
    const size = circleSize.value * 1.5;
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: `hsla(${aqua}, 0.1)`,
      opacity: interpolate(circleSize.value, [CIRCLE_MIN, CIRCLE_MAX], [0.45, 1]),
      alignItems: "center",
      justifyContent: "center",
    };
  });

  const advancePhase = (phases: BreathingPhase[], idx: number) => {
    const phase = phases[idx % phases.length];
    setCurrentPhase(phase);
    phaseSecondsRef.current = phase.durationSeconds;
    setPhaseSecondsLeft(phase.durationSeconds);

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
    if (pattern && selectedDuration === null) {
      const durations = pattern.durations;
      setSelectedDuration(durations[Math.floor(durations.length / 2)] ?? durations[0] ?? null);
    }
  }, [pattern, selectedDuration]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishingRef = useRef(false);

  useEffect(() => {
    if (screenPhase !== "active" || !pattern || totalSecondsRef.current <= 0) return;

    const id = setInterval(() => {
      totalSecondsRef.current -= 1;
      phaseSecondsRef.current -= 1;

      setSecondsLeft(totalSecondsRef.current);
      setPhaseSecondsLeft(phaseSecondsRef.current);

      if (totalSecondsRef.current <= 0) {
        clearInterval(id);
        void handleFinish();
        return;
      }

      if (phaseSecondsRef.current <= 0) {
        phaseIndexRef.current += 1;
        advancePhase(pattern.phases, phaseIndexRef.current);
      }
    }, 1000);
    intervalRef.current = id;

    return () => {
      clearInterval(id);
      intervalRef.current = null;
    };
    // The interval drives itself via refs; depending on the per-second secondsLeft would
    // tear it down and recreate it every tick, causing countdown drift.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenPhase, pattern]);

  if (!pattern) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center p-6">
          <Text variant="h2">{t("breathing.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleStart = () => {
    if (!selectedDuration) return;
    const totalSeconds = selectedDuration * 60;
    totalSecondsRef.current = totalSeconds;
    phaseIndexRef.current = 0;
    setSecondsLeft(totalSeconds);
    setScreenPhase("active");
    advancePhase(pattern.phases, 0);
  };

  const handleFinish = async () => {
    if (!selectedDuration) return;
    // Both the countdown (when it reaches 0) and the "Finish early" button call this.
    // Stop the interval and bail if a save is already in flight, so the same session is
    // never saved twice.
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const plannedSeconds = selectedDuration * 60;
    const elapsedSeconds = plannedSeconds - Math.max(0, totalSecondsRef.current);
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    try {
      await saveMutation.mutateAsync({
        exerciseName: pattern.slug,
        durationMinutes: elapsedMinutes,
        reflection: "",
        feelingAfter: null,
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace("/tools/breathing" as Parameters<typeof router.replace>[0]);
    } catch {
      // Reset the guard so the Finish button can retry the save instead of leaving the
      // screen stuck at 0:00 with a dead timer.
      finishingRef.current = false;
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const phaseLabelKey = currentPhase ? (`breathing.phases.${currentPhase.label}` as const) : null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t(`breathing.exercises.${pattern.slug}.title`)} />
            <Text variant="muted">{t(`breathing.exercises.${pattern.slug}.shortDescription`)}</Text>
          </View>

          {screenPhase === "intro" ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t(`breathing.exercises.${pattern.slug}.benefit`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <View className="gap-1">
                    {pattern.phases.map((phase, i) => (
                      <Text key={i} variant="muted">
                        {t(`breathing.phases.${phase.label}`)} - {phase.durationSeconds}s
                      </Text>
                    ))}
                  </View>
                </CardContent>
              </Card>

              <View className="gap-3">
                <Label>{t("breathing.chooseDuration")}</Label>
                <View className="flex-row flex-wrap gap-2">
                  {pattern.durations.map((d) => (
                    <Button
                      key={d}
                      onPress={() => setSelectedDuration(d)}
                      variant={selectedDuration === d ? "default" : "outline"}
                    >
                      <Text>{t("breathing.minutes", { value: d })}</Text>
                    </Button>
                  ))}
                </View>
              </View>

              <Button disabled={!selectedDuration} onPress={handleStart}>
                <Text>{t("breathing.start")}</Text>
              </Button>
            </>
          ) : null}

          {screenPhase === "active" ? (
            <View className="gap-6 items-center">
              <View
                className="items-center justify-center"
                style={{ height: CIRCLE_MAX * 1.5 + 40 }}
              >
                <Animated.View style={haloStyle}>
                  <Animated.View style={circleStyle} />
                </Animated.View>
              </View>

              {phaseLabelKey ? (
                <Text className="text-2xl font-semibold text-center">{t(phaseLabelKey)}</Text>
              ) : null}

              <Text variant="muted" className="text-center text-lg">
                {phaseSecondsLeft}s
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
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
