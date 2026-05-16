import { Audio } from "expo-av";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Vibration, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import { cn } from "@/lib/utils";

const BELL_ASSET = require("@/assets/sounds/bell.wav");

const DURATION_PRESETS = [5, 10, 15, 20, 30];

type TimerState = "idle" | "running" | "paused" | "completed";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function playBell() {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(BELL_ASSET, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch {
    Vibration.vibrate([0, 200, 100, 200]);
  }
}

export default function TimerScreen() {
  const { t } = useTranslation("timer");

  const [durationMinutes, setDurationMinutes] = useState(10);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerState === "idle") setSecondsLeft(durationMinutes * 60);
  }, [durationMinutes, timerState]);

  useEffect(() => {
    if (timerState === "running") {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setTimerState("completed");
            void playBell();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState]);

  const isActive = timerState === "running" || timerState === "paused";
  const progressFraction =
    timerState === "completed" ? 1 : 1 - secondsLeft / (durationMinutes * 60);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <View className="flex-1 gap-6 p-6">
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <BackButton showLabel={false} className="-ml-2" />
            <Text variant="h1">{t("title")}</Text>
          </View>
          <Text variant="muted">{t("description")}</Text>
        </View>

        {!isActive && timerState !== "completed" ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("duration.label")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {DURATION_PRESETS.map((min) => (
                <Pressable
                  key={min}
                  accessibilityRole="button"
                  accessibilityState={{ selected: durationMinutes === min }}
                  onPress={() => setDurationMinutes(min)}
                  className={cn(
                    "rounded-full border px-4 py-2",
                    durationMinutes === min
                      ? "border-primary bg-primary"
                      : "border-border bg-card active:bg-muted",
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-semibold",
                      durationMinutes === min ? "text-primary-foreground" : "text-foreground",
                    )}
                  >
                    {t("duration.minutes", { count: min })}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View className="flex-1 items-center justify-center gap-8">
          <View className="size-56 items-center justify-center rounded-full border-4 border-border">
            <View
              className="absolute inset-0 rounded-full border-4 border-primary"
              style={{
                opacity: progressFraction > 0 ? 1 : 0,
                transform: [{ scale: 0.98 + progressFraction * 0.02 }],
              }}
            />
            {timerState === "completed" ? (
              <View className="items-center gap-1">
                <Text className="text-4xl font-bold text-primary">✓</Text>
                <Text className="text-base font-semibold text-muted-foreground">
                  {t("complete.title")}
                </Text>
              </View>
            ) : (
              <Text className="text-5xl font-bold tabular-nums">{formatTime(secondsLeft)}</Text>
            )}
          </View>

          <View className="flex-row items-center gap-3">
            {timerState === "idle" ? (
              <Button onPress={() => setTimerState("running")} size="lg" className="min-w-[120px]">
                <Text>{t("timer.start")}</Text>
              </Button>
            ) : timerState === "running" ? (
              <>
                <Button
                  onPress={() => setTimerState("paused")}
                  variant="outline"
                  size="lg"
                  className="min-w-[120px]"
                >
                  <Text>{t("timer.pause")}</Text>
                </Button>
                <Button
                  onPress={() => {
                    setTimerState("idle");
                    setSecondsLeft(durationMinutes * 60);
                  }}
                  variant="ghost"
                  size="lg"
                >
                  <Text>{t("timer.reset")}</Text>
                </Button>
              </>
            ) : timerState === "paused" ? (
              <>
                <Button
                  onPress={() => setTimerState("running")}
                  size="lg"
                  className="min-w-[120px]"
                >
                  <Text>{t("timer.resume")}</Text>
                </Button>
                <Button
                  onPress={() => {
                    setTimerState("idle");
                    setSecondsLeft(durationMinutes * 60);
                  }}
                  variant="ghost"
                  size="lg"
                >
                  <Text>{t("timer.reset")}</Text>
                </Button>
              </>
            ) : (
              <View className="items-center gap-3">
                <Button
                  onPress={() => {
                    setTimerState("idle");
                    setSecondsLeft(durationMinutes * 60);
                  }}
                  size="lg"
                  className="min-w-[140px]"
                >
                  <Text>{t("timer.again")}</Text>
                </Button>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.push("/modules/meditation")}
                >
                  <Text className="text-sm text-primary">{t("openMeditationModule")}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
