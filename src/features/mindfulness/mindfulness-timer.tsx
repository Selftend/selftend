import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenBreadcrumb } from "@/src/components/app/screen-breadcrumb";
import type { MindfulnessExercise } from "@/src/constants/mindfulness";
import { exerciseHue, hueGradient, hueHsl } from "@/src/features/mindfulness/exercise-hue";
import { useAppColorScheme } from "@/src/lib/color-scheme";
import { cn } from "@/lib/utils";

const BREATHE_MS = 4500;
const CUE_MS = 5500;

interface MindfulnessTimerProps {
  exercise: MindfulnessExercise;
  durationMinutes: number;
  onComplete: () => void;
}

export function MindfulnessTimer({ exercise, durationMinutes, onComplete }: MindfulnessTimerProps) {
  const { t } = useTranslation("cbt");
  const isDark = useAppColorScheme() === "dark";
  const hue = exerciseHue(exercise.hue);

  const rawCues = t(`mindfulness.exercises.${exercise.slug}.cues`, { returnObjects: true });
  const cues = Array.isArray(rawCues) ? (rawCues as string[]) : [];

  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [running, setRunning] = useState(true);
  const [cueIndex, setCueIndex] = useState(0);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const scale = useSharedValue(0.86);

  // Breathing loop: scale 0.86 ↔ 1 while running.
  useEffect(() => {
    if (running) {
      scale.value = withRepeat(
        withTiming(1, { duration: BREATHE_MS, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(scale);
    }
    return () => cancelAnimation(scale);
  }, [running, scale]);

  // Countdown.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Fire completion once when reaching zero.
  useEffect(() => {
    if (secondsLeft === 0) {
      setRunning(false);
      onCompleteRef.current();
    }
  }, [secondsLeft]);

  // Cue rotation.
  useEffect(() => {
    if (!running || cues.length === 0) return;
    const id = setInterval(() => setCueIndex((i) => (i + 1) % cues.length), CUE_MS);
    return () => clearInterval(id);
  }, [running, cues.length]);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const time = `${minutes}:${String(seconds).padStart(2, "0")}`;
  const cueText = running ? (cues[cueIndex] ?? "") : t("mindfulness.paused");

  const restart = () => {
    setSecondsLeft(durationMinutes * 60);
    setCueIndex(0);
    setRunning(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <LinearGradient
        colors={hueGradient(exercise.hue, isDark)}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.8]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
        }}
      />
      <View className="px-6 pt-3">
        <ScreenBreadcrumb />
      </View>

      <View className="flex-1 items-center justify-center gap-10 px-6">
        <Text className={cn("text-[12px] font-bold uppercase tracking-[0.16em]", hue.classes.text)}>
          {t(`mindfulness.exercises.${exercise.slug}.title`)}
        </Text>

        <View className="items-center justify-center" style={{ height: 240 }}>
          <Animated.View
            style={[
              orbStyle,
              {
                width: 200,
                height: 200,
                borderRadius: 100,
                borderWidth: 1,
                backgroundColor: hueHsl(exercise.hue, isDark, 0.18),
                borderColor: hueHsl(exercise.hue, isDark, 0.5),
              },
            ]}
          />
        </View>

        <View className="items-center gap-3">
          <Text className="text-6xl font-light tracking-tight">{time}</Text>
          <Text variant="muted" className="text-base">
            {cueText}
          </Text>
        </View>

        <View className="flex-row items-center gap-4">
          <Pressable
            accessibilityLabel={t("mindfulness.finishEarly")}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onComplete}
            className="size-14 items-center justify-center rounded-full border border-border bg-card"
          >
            <Icon name="stop" className="size-6 text-foreground" />
          </Pressable>

          <Pressable
            accessibilityLabel={running ? t("mindfulness.pause") : t("mindfulness.resume")}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setRunning((r) => !r)}
            className={cn("size-[72px] items-center justify-center rounded-full", hue.classes.fill)}
          >
            <Icon name={running ? "pause" : "play-arrow"} className="text-white" size={32} />
          </Pressable>

          <Pressable
            accessibilityLabel={t("mindfulness.start")}
            accessibilityRole="button"
            hitSlop={8}
            onPress={restart}
            className="size-14 items-center justify-center rounded-full border border-border bg-card"
          >
            <Icon name="replay" className="size-6 text-foreground" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
