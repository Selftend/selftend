import { Pressable, View } from "react-native";

import { cn } from "@/lib/utils";
import { Text } from "@/src/components/react-native-reusables/text";
import { spaceKeyActivationProps } from "@/src/lib/accessibility";

interface ChoiceOption {
  value: string;
  label: string;
}

interface ChoiceRowProps {
  label: string;
  options: ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  /** Per-button minimum width, which is what decides where the row wraps. */
  itemClassName?: string;
  /** On the group, so a test can scope to it - the two rows share labels like `5 min`. */
  testID?: string;
}

/**
 * One pick from a run of named choices - the interval bell. (The sit's length
 * used this row too until #930 gave it back its per-minute slider.)
 *
 * The label is the design's 11px eyebrow, but on its own line rather than inline
 * with the buttons. Inline is what the design draws and it is the tightest row on
 * the meditation home screen: `Interval bell` plus four buttons measures past
 * 328dp usable in `en` before `bg`'s `Междинен звън` makes it worse, and the row
 * neither wraps nor scrolls in the drawing - it would simply clip.
 *
 * A radiogroup, not a row of buttons: exactly one is chosen, and that is what a
 * screen reader should hear. Selection shifts border, fill AND weight together,
 * because a 10% tint is not a distinction on its own (#691), and the ink is
 * `text-primary-ink` rather than `text-primary` - the latter on `bg-primary/10`
 * measures 3.81:1, under AA for text this size (#368).
 */
export function ChoiceRow({
  label,
  options,
  value,
  onChange,
  itemClassName,
  testID,
}: ChoiceRowProps) {
  return (
    <View className="gap-2">
      <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </Text>
      <View
        // `accessibilityLabel`, not `aria-label`: the group needs a name on
        // native too, and RNW maps this one to `aria-label` on the way out. The
        // View is deliberately NOT `accessible` - that would collapse the four
        // radios inside it into one node on iOS.
        accessibilityLabel={label}
        accessibilityRole="radiogroup"
        role="radiogroup"
        testID={testID}
        className="flex-row flex-wrap gap-2"
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              aria-checked={selected}
              onPress={() => onChange(option.value)}
              // 44dp on the shortest axis without hitSlop: these are the primary
              // controls of the screen, not chips in a long list, so the target
              // is the button itself.
              className={cn(
                "min-h-[44px] grow items-center justify-center rounded-lg border px-3",
                itemClassName,
                selected ? "border-primary bg-primary/10" : "border-border bg-card",
              )}
              role="radio"
              {...spaceKeyActivationProps(() => onChange(option.value))}
            >
              <Text
                className={cn(
                  "text-[13px] tabular-nums",
                  selected ? "font-semibold text-primary-ink" : "text-foreground",
                )}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
