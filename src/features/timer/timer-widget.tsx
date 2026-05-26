import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { PanResponder, Platform, Pressable, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  DEFAULT_TIMER_DURATION_MINUTES,
  loadLastSessionDuration,
  MAX_TIMER_DURATION_MINUTES,
  MIN_TIMER_DURATION_MINUTES,
  normalizeTimerDuration,
  saveLastSessionDuration,
} from "@/src/features/timer/storage";

type TimerState = "idle" | "running" | "paused" | "completed";

// Each "bar slot" is this many pixels wide (center to center)
const BAR_SPACING = 14;
const BAR_W = 3;
const BAR_MAX_H = 72;
const BAR_MIN_H = 3;
// Sigma in bar-units: how quickly bars shrink away from center
const SIGMA = 4.5;
const bellSound = require("@/assets/sounds/bell.wav");
let nativeAudioModeConfigured = false;
type ExpoAvModule = typeof import("expo-av");

function clampDuration(value: number): number {
  return Math.max(MIN_TIMER_DURATION_MINUTES, Math.min(MAX_TIMER_DURATION_MINUTES, value));
}

function bellH(distInBars: number): number {
  const t = Math.exp(-0.5 * Math.pow(distInBars / SIGMA, 2));
  return BAR_MIN_H + (BAR_MAX_H - BAR_MIN_H) * t;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function playBell() {
  try {
    if (Platform.OS === "web") {
      const audio = new window.Audio(bellSound as string);
      await audio.play();
      return;
    }

    // Keep expo-av out of the web startup path; native still uses it until the expo-audio migration.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Audio } = require("expo-av") as ExpoAvModule;
    if (!nativeAudioModeConfigured) {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      nativeAudioModeConfigured = true;
    }

    const { sound } = await Audio.Sound.createAsync(bellSound);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
    });
  } catch (e) {
    console.error("[bell] error", e);
  }
}

function DurationPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t } = useTranslation("timer");
  const [isEditing, setIsEditing] = useState(false);
  const [inputText, setInputText] = useState(String(value));
  // continuousPos drives bar rendering - it's a float, e.g. 15.3
  const [continuousPos, setContinuousPos] = useState<number>(value);
  const [containerWidth, setContainerWidth] = useState(0);

  const continuousPosRef = useRef<number>(value);
  const dragStartPosRef = useRef<number>(value);
  const inputRef = useRef<TextInput>(null);

  // Sync when value changes externally (e.g. text input commit)
  useEffect(() => {
    if (Math.round(continuousPosRef.current) !== value) {
      continuousPosRef.current = value;
      setContinuousPos(value);
    }
    if (!isEditing) setInputText(String(value));
  }, [value, isEditing]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartPosRef.current = continuousPosRef.current;
      },
      onPanResponderMove: (_e, gs) => {
        // Drag left = value increases (opposite of drag direction)
        const raw = dragStartPosRef.current - gs.dx / BAR_SPACING;
        const clamped = clampDuration(raw);
        continuousPosRef.current = clamped;
        setContinuousPos(clamped);
        onChange(clampDuration(Math.round(clamped)));
      },
      onPanResponderRelease: () => {
        const snapped = clampDuration(Math.round(continuousPosRef.current));
        continuousPosRef.current = snapped;
        setContinuousPos(snapped);
        onChange(snapped);
      },
      onPanResponderTerminate: () => {
        const snapped = clampDuration(Math.round(continuousPosRef.current));
        continuousPosRef.current = snapped;
        setContinuousPos(snapped);
        onChange(snapped);
      },
    }),
  ).current;

  function startEditing() {
    setInputText(String(Math.round(continuousPosRef.current)));
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleInputChange(text: string) {
    setInputText(text);

    if (!/^\d+$/.test(text)) return;

    const parsed = Number(text);
    if (!Number.isFinite(parsed)) return;

    const next = clampDuration(parsed);
    continuousPosRef.current = next;
    setContinuousPos(next);
    onChange(next);
  }

  function commitInput() {
    const parsed = /^\d+$/.test(inputText) ? Number(inputText) : NaN;
    const next = Number.isFinite(parsed)
      ? clampDuration(parsed)
      : clampDuration(Math.round(continuousPosRef.current));
    continuousPosRef.current = next;
    setContinuousPos(next);
    setInputText(String(next));
    onChange(next);
    setIsEditing(false);
  }

  // Build bars: each integer value v gets a physical X position based on
  // its distance from continuousPos. Bars outside the container are skipped.
  const centerX = containerWidth / 2;
  const halfRange = containerWidth > 0 ? Math.ceil(centerX / BAR_SPACING) + 2 : 0;
  const bars: React.ReactNode[] = [];

  for (
    let v = Math.floor(continuousPos) - halfRange;
    v <= Math.ceil(continuousPos) + halfRange;
    v++
  ) {
    if (v < MIN_TIMER_DURATION_MINUTES || v > MAX_TIMER_DURATION_MINUTES) continue;
    const distInBars = v - continuousPos; // 0 = center, negative = left
    const screenX = centerX + distInBars * BAR_SPACING;
    if (screenX < -BAR_W || screenX > containerWidth + BAR_W) continue;
    const h = bellH(distInBars);
    const opacity = 0.2 + 0.8 * (h / BAR_MAX_H);
    bars.push(
      <View
        key={v}
        className="bg-foreground"
        style={{
          position: "absolute",
          left: screenX - BAR_W / 2,
          bottom: 0,
          width: BAR_W,
          height: h,
          borderRadius: 2,
          opacity,
        }}
      />,
    );
  }

  return (
    <View className="items-center gap-1">
      <Pressable onPress={startEditing} className="items-center py-1">
        {isEditing ? (
          <TextInput
            ref={inputRef}
            value={inputText}
            onChangeText={handleInputChange}
            onBlur={commitInput}
            onSubmitEditing={commitInput}
            keyboardType="number-pad"
            returnKeyType="done"
            selectTextOnFocus
            className="text-center text-5xl font-bold text-foreground"
            // @ts-ignore - web only
            style={{ outline: "none", minWidth: 90 }}
          />
        ) : (
          <Text className="text-5xl font-bold">{Math.round(continuousPos)}</Text>
        )}
        <Text className="text-xs text-muted-foreground">{t("duration.minutesUnit")}</Text>
      </Pressable>

      <View
        {...panResponder.panHandlers}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        style={{
          width: "100%",
          height: BAR_MAX_H + 8,
          overflow: "hidden",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {containerWidth > 0 ? bars : null}
      </View>
    </View>
  );
}

interface TimerWidgetProps {
  initialDuration?: number;
}

export function TimerWidget({
  initialDuration = DEFAULT_TIMER_DURATION_MINUTES,
}: TimerWidgetProps) {
  const { t } = useTranslation("timer");
  const suggestedDuration = normalizeTimerDuration(initialDuration);

  const [durationMinutes, setDurationMinutesState] = useState(suggestedDuration);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasUserSelectedDurationRef = useRef(false);

  useEffect(() => {
    if (hasUserSelectedDurationRef.current) return;
    setDurationMinutesState(suggestedDuration);
  }, [suggestedDuration]);

  useEffect(() => {
    let mounted = true;

    loadLastSessionDuration()
      .then((storedDuration) => {
        if (!mounted || storedDuration === null || hasUserSelectedDurationRef.current) return;
        hasUserSelectedDurationRef.current = true;
        setDurationMinutesState(storedDuration);
      })
      .catch((error) => {
        console.error("[timer] failed to load last session duration", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

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

  function setDurationMinutes(minutes: number) {
    hasUserSelectedDurationRef.current = true;
    setDurationMinutesState(normalizeTimerDuration(minutes));
  }

  function start() {
    const sessionDuration = normalizeTimerDuration(durationMinutes);
    void saveLastSessionDuration(sessionDuration).catch((error) => {
      console.error("[timer] failed to save last session duration", error);
    });
    void playBell();
    setTimerState("running");
  }

  function reset() {
    setTimerState("idle");
    setSecondsLeft(durationMinutes * 60);
  }

  function finishEarly() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const elapsedMinutes = Math.max(1, Math.round((durationMinutes * 60 - secondsLeft) / 60));
    setTimerState("idle");
    setSecondsLeft(durationMinutes * 60);
    router.push({
      pathname: "/tools/meditation/session/log",
      params: { duration: String(elapsedMinutes) },
    });
  }

  return (
    <View className="gap-4">
      {!isActive && timerState !== "completed" ? (
        <DurationPicker value={durationMinutes} onChange={setDurationMinutes} />
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
          <Button onPress={start} className="flex-1">
            <Text>{t("timer.start")}</Text>
          </Button>
        ) : timerState === "running" ? (
          <>
            <Button onPress={() => setTimerState("paused")} variant="outline" className="flex-1">
              <Text>{t("timer.pause")}</Text>
            </Button>
            <Button onPress={finishEarly} variant="ghost">
              <Text>{t("timer.finishEarly")}</Text>
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
            <Button onPress={finishEarly} variant="ghost">
              <Text>{t("timer.finishEarly")}</Text>
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
