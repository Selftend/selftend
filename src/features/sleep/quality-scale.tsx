import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useColorSchemeName } from "@/src/lib/color-scheme";
import { chipHsl } from "@/src/lib/hue-chip";
import { useRovingFocus } from "@/src/lib/roving-focus";

// Sleep quality as five named options rather than five stars (#774).
//
// A star rating and a named scale are different instruments: stars invite a
// *rating* - a score out of five, with the top one as the thing to aim at -
// and words invite a *description*. "Fair" is a report; three-of-five is a
// mark. The stored value is unchanged (1..5 in `sleep_logs.quality`), so this
// is an instrument swap, not a data change.
//
// The words are the whole ordinal cue. Every option is drawn in the same hue -
// selected or not is the only thing colour says here - which is deliberately
// NOT the five-hue ramp the design drew and check-in rejected on #701: a
// non-monotonic hue run carries no order for a sighted reader and collapses
// under deuteranopia. `quality-tint.ts` keeps the ramp for the *display*
// surfaces, where a five-word legend would not fit; an input has room to say
// it in words.
const QUALITY_LABEL_KEYS = [
  "log.qualityOptions.veryPoor",
  "log.qualityOptions.poor",
  "log.qualityOptions.fair",
  "log.qualityOptions.good",
  "log.qualityOptions.excellent",
] as const;

export const SLEEP_QUALITY_LEVELS = [1, 2, 3, 4, 5] as const;

export function QualityScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number) => void;
}) {
  const { t } = useTranslation("sleep");
  // The certified chip stops, not the design's `ink/0.14` fill under raw
  // `hsl(var(--ink))` text - #691 measured that shape at 3.81:1. `chip.ink` is
  // a lightness-corrected ink built for sitting on `chip.fill`.
  const chip = chipHsl("ink")[useColorSchemeName()];
  const roving = useRovingFocus({
    count: SLEEP_QUALITY_LEVELS.length,
    // Nothing chosen yet: the first option holds the tab stop so the group
    // stays keyboard-reachable, exactly as the star row did.
    activeIndex: value === null ? 0 : value - 1,
    onActivate: (index) => onChange(index + 1),
  });

  return (
    // A wrapping run, not five `flex-1` columns. Five equal columns across a
    // 360dp screen give each word ~53dp of text, and "Excellent" needs ~57dp at
    // 12px - a single word has no break opportunity, so it would clip rather
    // than wrap. Content-sized chips fit one row on a wide screen and fall to
    // two on a phone, in reading order, and that holds for `bg` too where
    // "Много лошо" is the long one.
    <View
      accessibilityLabel={t("log.qualityLabel")}
      accessibilityRole="radiogroup"
      className="flex-row flex-wrap gap-2"
      role="radiogroup"
      testID="sleep-quality-scale"
    >
      {SLEEP_QUALITY_LEVELS.map((level, index) => {
        const active = value === level;
        const label = t(QUALITY_LABEL_KEYS[index]);
        return (
          <Pressable
            key={level}
            accessibilityRole="radio"
            aria-checked={active}
            accessibilityLabel={label}
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={() => onChange(level)}
            className={cn(
              "rounded-full border px-4 py-2 active:opacity-70",
              !active && "border-border bg-background",
            )}
            // Selection rides on the chip ink, the stop certified against the
            // room surface; the resting border is too soft to read as state.
            style={active ? { backgroundColor: chip.fill, borderColor: chip.ink } : undefined}
            role="radio"
            {...roving.getItemProps(index, () => onChange(level))}
          >
            <Text
              className={cn("text-sm font-semibold", !active && "text-muted-foreground")}
              style={active ? { color: chip.ink } : undefined}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
