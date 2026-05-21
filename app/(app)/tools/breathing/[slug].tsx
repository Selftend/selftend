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
import { BackButton } from "@/src/components/app/back-button";
import { breathingLookup } from "@/src/constants/breathing";
import type { BreathingPhase } from "@/src/constants/breathing";
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

  const circleStyle = useAnimatedStyle(() => ({
    width: circleSize.value,
    height: circleSize.value,
    borderRadius: circleSize.value / 2,
  }));

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
    if (screenPhase !== "active" || !pattern || secondsLeft <= 0) return;

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

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenPhase, pattern, secondsLeft]);

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
    try {
      await saveMutation.mutateAsync({
        exerciseName: pattern.slug,
        durationMinutes: selectedDuration,
        reflection: "",
        moodAfter: null,
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace("/tools/breathing" as Parameters<typeof router.replace>[0]);
    } catch {
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
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t(`breathing.exercises.${pattern.slug}.title`)}</Text>
            </View>
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
              <View className="items-center justify-center" style={{ height: CIRCLE_MAX + 40 }}>
                <Animated.View
                  style={circleStyle}
                  className="bg-primary/20 border-2 border-primary"
                />
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
