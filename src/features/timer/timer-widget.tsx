import { router } from "expo-router";
import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";

const DURATION_PRESETS = [5, 10, 15, 20, 30];

type TimerState = "idle" | "running" | "paused" | "completed";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface TimerWidgetProps {
  initialDuration?: number;
}

async function playBell() {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(require("@/assets/sounds/bell.wav"));
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
    });
  } catch (e) {
    console.error("[bell] error", e);
  }
}

export function TimerWidget({ initialDuration = 10 }: TimerWidgetProps) {
  const { t } = useTranslation("timer");

  const validInitial = DURATION_PRESETS.includes(initialDuration) ? initialDuration : 10;
  const [durationMinutes, setDurationMinutes] = useState(validInitial);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(validInitial * 60);
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

  function reset() {
    setTimerState("idle");
    setSecondsLeft(durationMinutes * 60);
  }

  return (
    <View className="gap-4">
      {!isActive && timerState !== "completed" ? (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                  "rounded-full border px-3 py-1.5",
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

      {timerState === "completed" ? (
        <View className="items-center gap-1 py-2">
          <Text className="text-3xl font-bold text-primary">✓</Text>
          <Text className="text-base font-semibold text-muted-foreground">
            {t("complete.title")}
          </Text>
        </View>
      ) : isActive ? (
        <Text className="text-center text-4xl font-bold tabular-nums">
          {formatTime(secondsLeft)}
        </Text>
      ) : null}

      <View className="flex-row items-center gap-2">
        {timerState === "idle" ? (
          <Button
            onPress={() => {
              void playBell();
              setTimerState("running");
            }}
            className="flex-1"
          >
            <Text>{t("timer.start")}</Text>
          </Button>
        ) : timerState === "running" ? (
          <>
            <Button onPress={() => setTimerState("paused")} variant="outline" className="flex-1">
              <Text>{t("timer.pause")}</Text>
            </Button>
            <Button onPress={reset} variant="ghost">
              <Text>{t("timer.reset")}</Text>
            </Button>
          </>
        ) : timerState === "paused" ? (
          <>
            <Button onPress={() => setTimerState("running")} className="flex-1">
              <Text>{t("timer.resume")}</Text>
            </Button>
            <Button onPress={reset} variant="ghost">
              <Text>{t("timer.reset")}</Text>
            </Button>
          </>
        ) : (
          <>
            <Button onPress={reset} variant="outline" className="flex-1">
              <Text>{t("timer.again")}</Text>
            </Button>
            <Button
              onPress={() =>
                router.push({
                  pathname: "/tools/meditation/session/log",
                  params: { duration: String(durationMinutes) },
                })
              }
              className="flex-1"
            >
              <Text>{t("logSit")}</Text>
            </Button>
          </>
        )}
      </View>
    </View>
  );
}
