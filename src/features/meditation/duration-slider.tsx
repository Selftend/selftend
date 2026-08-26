import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { VolumeSlider } from "@/src/components/app/volume-slider";
import { cn } from "@/lib/utils";

/**
 * The picker's range, in whole minutes (#930, reversing #785).
 *
 * #785 replaced the original 1-120 drag scrubber with six named lengths because
 * the drag "could express 63 minutes and made 12 hard work". The owner asked for
 * per-minute resolution back; the steppers are what answer the old complaint
 * this time - one tap is exactly one minute, no dragging required. The range is
 * the original control's. The sitting screen accepts 1-180 from the route
 * param, so everything expressible here is startable.
 */
export const MIN_SIT_MINUTES = 1;
export const MAX_SIT_MINUTES = 120;

/** The track's 0..1 position for a length, for feeding the slider. */
export function fractionFromMinutes(minutes: number): number {
  return (minutes - MIN_SIT_MINUTES) / (MAX_SIT_MINUTES - MIN_SIT_MINUTES);
}

/** The whole minute a track position lands on, clamped into range. */
export function minutesFromFraction(fraction: number): number {
  const raw = MIN_SIT_MINUTES + fraction * (MAX_SIT_MINUTES - MIN_SIT_MINUTES);
  return Math.min(MAX_SIT_MINUTES, Math.max(MIN_SIT_MINUTES, Math.round(raw)));
}

interface DurationSliderProps {
  /** The chosen length, in whole minutes. */
  value: number;
  /** Fires continuously while dragging - use for the live read-out. */
  onChange: (minutes: number) => void;
  /**
   * Fires once when a change settles: a drag release, or a stepper press (which
   * is already a settled value). Use to persist (#1190) - a drag emits a change
   * per whole minute crossed, so persisting from `onChange` would be one write
   * per minute of travel.
   */
  onCommit?: (minutes: number) => void;
  /** On the container, so a test can scope to this control. */
  testID?: string;
}

/**
 * The sit's length: a per-minute slider flanked by one-minute steppers (#930).
 *
 * Drag covers distance, the steppers cover precision - and they double as the
 * screen-reader and keyboard path, which a bare drag track does not have. The
 * read-out sits on the label line, mirroring how "ends about" rides the section
 * header above.
 */
export function DurationSlider({ value, onChange, onCommit, testID }: DurationSliderProps) {
  const { t } = useTranslation("meditation");

  // Dedup against the last minute actually emitted, not the prop: a drag fires
  // per-move with sub-minute fractions, and re-emitting the same minute would
  // re-read the clock upstream for nothing. Written in an effect, not render,
  // so the compiler's rules hold.
  const lastEmittedRef = useRef(value);
  useEffect(() => {
    lastEmittedRef.current = value;
  });

  function emit(minutes: number) {
    if (minutes === lastEmittedRef.current) return;
    lastEmittedRef.current = minutes;
    onChange(minutes);
  }

  /** A stepper press is both the change and its settling, so it does both. */
  function step(minutes: number) {
    emit(minutes);
    onCommit?.(minutes);
  }

  const atMin = value <= MIN_SIT_MINUTES;
  const atMax = value >= MAX_SIT_MINUTES;

  return (
    <View className="gap-2" testID={testID}>
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {t("module.home.durationLabel")}
        </Text>
        <Text className="text-[13px] font-semibold tabular-nums text-foreground">
          {t("duration.minutes", { count: value })}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <StepButton
          icon="remove"
          label={t("module.home.minuteLess")}
          disabled={atMin}
          onPress={() => step(Math.max(MIN_SIT_MINUTES, value - 1))}
        />
        <View className="flex-1">
          <VolumeSlider
            value={fractionFromMinutes(value)}
            onChange={(fraction) => emit(minutesFromFraction(fraction))}
            onCommit={(fraction) => onCommit?.(minutesFromFraction(fraction))}
            accessibilityLabel={t("module.home.durationLabel")}
            accessibilityValue={{
              min: MIN_SIT_MINUTES,
              max: MAX_SIT_MINUTES,
              now: value,
              text: t("duration.minutes", { count: value }),
            }}
          />
        </View>
        <StepButton
          icon="add"
          label={t("module.home.minuteMore")}
          disabled={atMax}
          onPress={() => step(Math.min(MAX_SIT_MINUTES, value + 1))}
        />
      </View>
    </View>
  );
}

interface StepButtonProps {
  icon: "remove" | "add";
  label: string;
  disabled: boolean;
  onPress: () => void;
}

/** One minute, one tap - the precision half of the control. */
function StepButton({ icon, label, disabled, onPress }: StepButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      // 44dp without hitSlop, like the choice buttons this control replaced:
      // primary controls of the screen, not chips in a long list.
      className={cn(
        "h-11 w-11 items-center justify-center rounded-full border border-border bg-card",
        disabled ? "opacity-40" : "active:opacity-70",
      )}
      // No spaceKeyActivationProps: RNW already fires onPress on Space for
      // role="button", and adding the helper would step twice per press - it
      // exists for the radio/checkbox roles Space does nothing for natively.
      role="button"
    >
      <Icon aria-hidden name={icon} className="size-5 text-foreground" />
    </Pressable>
  );
}
