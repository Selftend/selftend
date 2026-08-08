import { Pressable, View } from "react-native";

import { cn } from "@/lib/utils";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP, spaceKeyActivationProps } from "@/src/lib/accessibility";

interface SelectableChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  /**
   * Optional leading glyph, rendered **inline at text size** — deliberately not
   * a tile. The design's caption objects to emoji *tiles* ("no emoji tiles, no
   * boxes-in-boxes"), which is an accurate description of the stacked 24px
   * glyph this replaces; a 14px inline glyph is not one, so the emoji stays.
   */
  emoji?: string;
  /** Defaults to `label`; pass when the visible text is not the whole name. */
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * A togglable text chip — the shared treatment for picking several things from a
 * flat run (#738, decided on #699).
 *
 * Exported rather than inlined because the emoji picker's selection state reuses
 * it (#743): the design draws that selection as `be/0.16` plus a `0.4` ring,
 * which is `RAMP_ALPHAS[0]` at ~1.26 and effectively invisible, so it takes this
 * treatment instead.
 *
 * **Selection is never encoded by colour alone.** Border, weight and fill all
 * shift together, which matters because the fill is only a 10% tint — #691's
 * non-colour-cue constraint applies to any two-state control, not just the ramp.
 *
 * `text-primary-ink`, never `text-primary`: the latter on `bg-primary/10` is the
 * pattern #691 named a regression and #368 measured at 3.81:1, under AA for text
 * this size.
 *
 * The chip stays ~32px tall so a long list does not become a scroll; the ≥44dp
 * touch target comes from `hitSlop`, as it does on the body-sensation chips
 * beside it.
 */
export function SelectableChip({
  label,
  selected,
  onToggle,
  emoji,
  accessibilityLabel,
  testID,
}: SelectableChipProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="checkbox"
      aria-checked={selected}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onToggle}
      testID={testID}
      className={cn(
        "flex-row items-center gap-1.5 rounded-full border px-3 py-1.5",
        selected ? "border-primary bg-primary/10" : "border-border bg-card",
      )}
      {...spaceKeyActivationProps(onToggle)}
    >
      {emoji ? (
        // Decorative: the label already carries the name, and announcing the
        // glyph would read the emotion twice.
        <Text aria-hidden className="text-[14px] leading-none">
          {emoji}
        </Text>
      ) : null}
      <Text
        className={cn(
          "text-[13px]",
          selected ? "font-semibold text-primary-ink" : "text-foreground",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface ChipRunProps {
  children: React.ReactNode;
  className?: string;
}

/** A wrapping run of chips. One flat row-set — no columns, no headings. */
export function ChipRun({ children, className }: ChipRunProps) {
  return <View className={cn("flex-row flex-wrap gap-2", className)}>{children}</View>;
}
