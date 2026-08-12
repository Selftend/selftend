// The five length buttons shared by session setup (`4b`) and the new-pattern
// editor's "Default length" row (`4d`).
//
// They pick a MINUTE TARGET and derive the cycle count from the pattern's own
// cycle length, which is the whole point: "2 min" is 8 cycles of box breathing
// and 6 cycles of 4-7-8. What is stored and run is still a cycle count.
//
// The selected state is the shared chip treatment - `border-primary
// bg-primary/10` behind `text-primary-ink`, the same shape as
// selectable-chip.tsx and meditation's ChoiceRow - not the pattern's colour:
// #926 moved the setup controls onto theme tokens, and "how long do I want to
// sit" is a setting the user is making, not the categorical pattern datum the
// dot and the live pacer carry.
//
// `text-primary-ink`, never `text-primary`: the latter on `bg-primary/10` is
// the exact shape #691 named a regression and #368 measured at 3.81:1 - it
// fails AA.

import { View, Pressable } from "react-native";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Text } from "@/src/components/react-native-reusables/text";
import { SESSION_LENGTH_MINUTES, cyclesForMinutes } from "@/src/features/breathing/cycle-math";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

export function SessionLengthButtons({
  secondsPerCycle,
  selectedCycles,
  onSelect,
}: {
  secondsPerCycle: number;
  selectedCycles: number;
  onSelect: (cycles: number) => void;
}) {
  const { t } = useTranslation("cbt");

  return (
    // 360dp: five buttons at flex-1 across a 328dp column is 60.8dp each, and
    // "10 min" / "10 мин" measure ~42dp at 13px, so they fit on one line in both
    // locales. `flex-wrap` with a 56dp basis is the insurance: at a narrower
    // width or a larger font scale the row wraps to two lines rather than
    // clipping the last button, which is the failure the design's fixed row has.
    <View testID="breathing-length-buttons" className="flex-row flex-wrap gap-1.5">
      {SESSION_LENGTH_MINUTES.map((minutes) => {
        const cycles = cyclesForMinutes(secondsPerCycle, minutes);
        const active = cycles === selectedCycles;
        return (
          <Pressable
            key={minutes}
            accessibilityRole="radio"
            aria-checked={active}
            accessibilityLabel={t("breathing.minutes", { value: minutes })}
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={() => onSelect(cycles)}
            // Selection shifts border, fill AND weight together - a 10% tint is
            // not a distinction on its own (#691), so colour is never the only
            // cue.
            className={cn(
              "min-w-[56px] grow basis-0 items-center justify-center rounded-lg border px-1.5 py-2.5",
              active ? "border-primary bg-primary/10" : "border-border",
            )}
            role="radio"
          >
            <Text
              className={cn("text-[13px] tabular-nums", active && "font-semibold text-primary-ink")}
              numberOfLines={1}
              variant={active ? undefined : "muted"}
            >
              {t("breathing.minutes", { value: minutes })}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
