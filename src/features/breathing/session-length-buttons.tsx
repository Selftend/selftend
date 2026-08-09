// The five length buttons shared by session setup (`4b`) and the new-pattern
// editor's "Default length" row (`4d`).
//
// They pick a MINUTE TARGET and derive the cycle count from the pattern's own
// cycle length, which is the whole point: "2 min" is 8 cycles of box breathing
// and 6 cycles of 4-7-8. What is stored and run is still a cycle count.
//
// ⚠️ The design draws the selected state as `hsl(var(--aqua))` text on an
// `aqua/0.14` fill. That is the exact shape #691 named a regression and #368
// measured at 3.81:1 - it fails AA. The selected state here is the chip recipe
// instead: `chip.fill` behind `chip.ink`, which src/lib/hue-chip.ts tunes
// per-hue specifically so ink-on-fill clears 4.5:1 in both schemes
// (test/chip-contrast.test.ts holds the floor). No `text-<hue>` anywhere.
//
// The hue is the PATTERN's colour, not the tool's. Under #691 a hue has to
// encode data, and "which pattern am I setting up" is data; painting the row
// aqua because breathing is the aqua tool would be identity, which is the use
// the rule forbids.

import { View, Pressable } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { breathingChipColors } from "@/src/features/breathing/exercise-colors";
import type { BreathingExerciseColor } from "@/src/features/breathing/exercise-types";
import { SESSION_LENGTH_MINUTES, cyclesForMinutes } from "@/src/features/breathing/cycle-math";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useColorSchemeName } from "@/src/lib/color-scheme";

export function SessionLengthButtons({
  secondsPerCycle,
  selectedCycles,
  onSelect,
  accent = "aqua",
}: {
  secondsPerCycle: number;
  selectedCycles: number;
  onSelect: (cycles: number) => void;
  accent?: BreathingExerciseColor;
}) {
  const { t } = useTranslation("cbt");
  const scheme = useColorSchemeName();
  const chip = breathingChipColors(accent, scheme);

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
            // The resting border is `border-border` as a class, not an
            // `hsl(var(--border))` literal - the same rule the session screen is
            // held to, so a palette retune reaches these buttons too.
            className="min-w-[56px] grow basis-0 items-center justify-center rounded-lg border border-border px-1.5 py-2.5"
            role="radio"
            style={active ? { backgroundColor: chip.fill, borderColor: chip.ink } : undefined}
          >
            <Text
              className="text-[13px] font-semibold tabular-nums"
              numberOfLines={1}
              style={active ? { color: chip.ink } : undefined}
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
