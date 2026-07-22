import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { PanResponder, Pressable, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  DEFAULT_INTERVAL_MINUTES,
  INTERVAL_OPTIONS_MINUTES,
  isIntervalTick,
} from "@/src/features/timer/interval";
import {
  DEFAULT_TIMER_DURATION_MINUTES,
  loadIntervalMinutes,
  loadLastSessionDuration,
  MAX_TIMER_DURATION_MINUTES,
  MIN_TIMER_DURATION_MINUTES,
  normalizeIntervalMinutes,
  normalizeTimerDuration,
  saveIntervalMinutes,
  saveLastSessionDuration,
} from "@/src/features/timer/storage";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useRovingFocus } from "@/src/lib/roving-focus";
import { playOneShot } from "@/src/lib/native-audio";

type TimerState = "idle" | "running" | "paused" | "completed";

// Each "bar slot" is this many pixels wide (center to center)
const BAR_SPACING = 14;
const BAR_W = 3;
const BAR_MAX_H = 72;
const BAR_MIN_H = 3;
// Sigma in bar-units: how quickly bars shrink away from center
const SIGMA = 4.5;
const bellSound = require("@/assets/sounds/meditation-bell.wav") as number;
const intervalSound = require("@/assets/sounds/interval-temple-block.wav") as number;

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

function playSound(asset: number) {
  playOneShot(asset, 1);
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

  // Sync when value changes externally (e.g. text input commit) - a
  // render-time adjustment; the gesture callbacks' ref mirror is kept in
  // sync by the effect below.
  const [prevSync, setPrevSync] = useState({ value, isEditing });
  if (value !== prevSync.value || isEditing !== prevSync.isEditing) {
    setPrevSync({ value, isEditing });
    if (Math.round(continuousPos) !== value) setContinuousPos(value);
    if (!isEditing) setInputText(String(value));
  }

  // PanResponder callbacks can't see fresh state, so continuousPosRef mirrors
  // continuousPos for them (refs may only be written outside render).
  useEffect(() => {
    continuousPosRef.current = continuousPos;
  }, [continuousPos]);

  // eslint-disable-next-line react-hooks/refs -- PanResponder's callbacks are defined here but only ever run during gestures, never in render; the legacy API offers no compiler-era alternative
  const [panResponder] = useState(() =>
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
  );

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
      <Pressable
        accessibilityLabel={t("duration.editLabel")}
        accessibilityRole="button"
        onPress={startEditing}
        className="items-center py-1"
        role="button"
      >
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

function IntervalPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t } = useTranslation("timer");
  const selectedIndex = INTERVAL_OPTIONS_MINUTES.findIndex((minutes) => minutes === value);
  const roving = useRovingFocus({
    count: INTERVAL_OPTIONS_MINUTES.length,
    // No match (shouldn't happen): treat the first chip as active so the group stays tab-reachable.
    activeIndex: selectedIndex < 0 ? 0 : selectedIndex,
    onActivate: (index) => onChange(INTERVAL_OPTIONS_MINUTES[index]),
  });
  return (
    <View className="items-center gap-2">
      <Text className="text-xs text-muted-foreground">{t("interval.label")}</Text>
      <View
        accessibilityLabel={t("interval.label")}
        accessibilityRole="radiogroup"
        className="flex-row flex-wrap justify-center gap-2"
        role="radiogroup"
      >
        {INTERVAL_OPTIONS_MINUTES.map((minutes, index) => {
          const selected = minutes === value;
          return (
            <Pressable
              key={minutes}
              accessibilityRole="radio"
              aria-checked={selected}
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              role="radio"
              onPress={() => onChange(minutes)}
              {...roving.getItemProps(index, () => onChange(minutes))}
              className={cn(
                "rounded-full border px-4 py-1.5",
                selected ? "border-transparent bg-primary" : "border-border bg-card",
              )}
            >
              <Text
                className={cn(
                  "text-xs font-semibold",
                  selected ? "text-primary-foreground" : "text-foreground",
                )}
              >
                {minutes === 0 ? t("interval.off") : t("duration.minutes", { count: minutes })}
              </Text>
            </Pressable>
          );
        })}
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
  const [intervalMinutes, setIntervalMinutesState] = useState(DEFAULT_INTERVAL_MINUTES);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasUserSelectedDurationRef = useRef(false);
  const hasUserSelectedIntervalRef = useRef(false);
  // Captured at start() so the per-second tick reads stable values.
  const sessionTotalSecondsRef = useRef(0);
  const intervalSecondsRef = useRef(0);

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
    let mounted = true;

    loadIntervalMinutes()
      .then((stored) => {
        if (!mounted || stored === null || hasUserSelectedIntervalRef.current) return;
        setIntervalMinutesState(stored);
      })
      .catch((error) => {
        console.error("[timer] failed to load interval", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (timerState === "running") {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setTimerState("completed");
            playSound(bellSound);
            return 0;
          }
          const next = prev - 1;
          const elapsed = sessionTotalSecondsRef.current - next;
          if (isIntervalTick(elapsed, intervalSecondsRef.current)) {
            playSound(intervalSound);
          }
          return next;
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

  function setIntervalMinutes(minutes: number) {
    hasUserSelectedIntervalRef.current = true;
    setIntervalMinutesState(normalizeIntervalMinutes(minutes));
  }

  function start() {
    const sessionDuration = normalizeTimerDuration(durationMinutes);
    const sessionInterval = normalizeIntervalMinutes(intervalMinutes);
    sessionTotalSecondsRef.current = sessionDuration * 60;
    intervalSecondsRef.current = sessionInterval * 60;
    void saveLastSessionDuration(sessionDuration).catch((error) => {
      console.error("[timer] failed to save last session duration", error);
    });
    void saveIntervalMinutes(sessionInterval).catch((error) => {
      console.error("[timer] failed to save interval", error);
    });
    playSound(bellSound);
    // secondsLeft is only rendered while active, so seeding it here (instead
    // of tracking every idle duration change) keeps it correct.
    setSecondsLeft(sessionDuration * 60);
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
        <View className="gap-4">
          <DurationPicker value={durationMinutes} onChange={setDurationMinutes} />
          <IntervalPicker value={intervalMinutes} onChange={setIntervalMinutes} />
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
