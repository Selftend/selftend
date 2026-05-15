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
import { useMeditationSessions, useSaveMeditationSession } from "@/src/features/meditation/queries";
import { useSession } from "@/src/providers/session-provider";

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

export default function MeditationScreen() {
  const { t } = useTranslation("meditation");
  const { user } = useSession();
  const { data: sessions } = useMeditationSessions(user?.id ?? null, 5);
  const saveMutation = useSaveMeditationSession(user?.id ?? null);

  const [durationMinutes, setDurationMinutes] = useState(10);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerState === "idle") {
      setSecondsLeft(durationMinutes * 60);
    }
  }, [durationMinutes, timerState]);

  useEffect(() => {
    if (timerState === "running") {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setTimerState("completed");
            void playBell();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState]);

  function handleStart() {
    void playBell();
    setTimerState("running");
  }

  function handlePause() {
    setTimerState("paused");
  }

  function handleResume() {
    setTimerState("running");
  }

  function handleReset() {
    setTimerState("idle");
    setSecondsLeft(durationMinutes * 60);
  }

  function handleSave() {
    saveMutation.mutate(durationMinutes, {
      onSettled: () => router.back(),
    });
  }

  const isActive = timerState === "running" || timerState === "paused";
  const progressFraction =
    timerState === "completed" ? 1 : 1 - secondsLeft / (durationMinutes * 60);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <View className="flex-1 p-6 gap-6">
        {/* Header */}
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <BackButton showLabel={false} className="-ml-2" />
            <Text variant="h1">{t("title")}</Text>
          </View>
          <Text variant="muted">{t("description")}</Text>
        </View>

        {/* Duration picker */}
        {!isActive && timerState !== "completed" ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("duration.label")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {DURATION_PRESETS.map((min) => (
                <Pressable
                  accessibilityLabel={t("duration.minutes", { count: min })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: durationMinutes === min }}
                  key={min}
                  onPress={() => setDurationMinutes(min)}
                  className={cn(
                    "rounded-full px-4 py-2 border",
                    durationMinutes === min
                      ? "bg-primary border-primary"
                      : "bg-card border-border active:bg-muted",
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

        {/* Timer face */}
        <View className="flex-1 items-center justify-center gap-8">
          {/* Progress ring */}
          <View className="items-center justify-center">
            <View className="size-56 rounded-full border-4 border-border items-center justify-center">
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
                <View className="items-center gap-1">
                  <Text className="text-5xl font-bold tabular-nums">{formatTime(secondsLeft)}</Text>
                  {isActive ? (
                    <Text variant="muted" className="text-sm">
                      {t("timer.remaining", { time: formatTime(secondsLeft) })}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          </View>

          {/* Controls */}
          <View className="flex-row gap-3 items-center">
            {timerState === "idle" ? (
              <Button onPress={handleStart} size="lg" className="min-w-[120px]">
                <Text>{t("timer.start")}</Text>
              </Button>
            ) : timerState === "running" ? (
              <>
                <Button onPress={handlePause} variant="outline" size="lg" className="min-w-[120px]">
                  <Text>{t("timer.pause")}</Text>
                </Button>
                <Button onPress={handleReset} variant="ghost" size="lg">
                  <Text>{t("timer.reset")}</Text>
                </Button>
              </>
            ) : timerState === "paused" ? (
              <>
                <Button onPress={handleResume} size="lg" className="min-w-[120px]">
                  <Text>{t("timer.resume")}</Text>
                </Button>
                <Button onPress={handleReset} variant="ghost" size="lg">
                  <Text>{t("timer.reset")}</Text>
                </Button>
              </>
            ) : (
              <>
                <Button
                  onPress={handleSave}
                  size="lg"
                  className="min-w-[140px]"
                  disabled={saveMutation.isPending}
                >
                  <Text>{t("complete.save")}</Text>
                </Button>
                <Button onPress={handleReset} variant="ghost" size="lg">
                  <Text>{t("complete.discard")}</Text>
                </Button>
              </>
            )}
          </View>
        </View>

        {/* Recent sessions */}
        {sessions && sessions.length > 0 && timerState === "idle" ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("history.title")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {sessions.map((s) => (
                <View key={s.id} className="rounded-full bg-muted px-3 py-1">
                  <Text className="text-xs text-muted-foreground">
                    {t("history.session", { count: s.durationMinutes })}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
