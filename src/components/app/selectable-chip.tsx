import { Pressable, View } from "react-native";

import { cn } from "@/lib/utils";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP, spaceKeyActivationProps } from "@/src/lib/accessibility";
import type { RovingItemProps } from "@/src/lib/roving-focus";

interface SelectableChipProps {
  label: string;
  selected: boolean;
  /** For a radio chip this is "select me" - the name is kept so no consumer moves. */
  onToggle: () => void;
  /**
   * `checkbox` (the default) picks any number from a run; `radio` (#1725) picks
   * one. A radio chip belongs inside a `radiogroup` the CALLER renders - the
   * chip cannot know its siblings, so it never draws the group itself.
   */
  role?: "checkbox" | "radio";
  /**
   * The caller's `useRovingFocus().getItemProps(index, onToggle)`, for a chip in
   * a radiogroup: arrows move between chips, Space selects, as in the emoji
   * picker. When given, it REPLACES the chip's own Space handler rather than
   * stacking on it - both own `onKeyDown`, so stacked they would either clobber
   * each other or fire the selection twice per Space (the RNW Space-activation
   * trap). `{}` on native, where there is nothing to rove.
   */
  rovingProps?: RovingItemProps;
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
 *
 * `aria-checked`, never `accessibilityState`: react-native-web drops the latter
 * and the eslint gate forbids it. React Native maps `aria-checked` onto
 * `accessibilityState.checked` itself, so a radio's checked state follows
 * `selected` on every platform through the one prop.
 */
export function SelectableChip({
  label,
  selected,
  onToggle,
  role = "checkbox",
  rovingProps,
  emoji,
  accessibilityLabel,
  testID,
}: SelectableChipProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={role}
      role={role}
      aria-checked={selected}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onToggle}
      testID={testID}
      className={cn(
        "flex-row items-center gap-1.5 rounded-full border px-3 py-1.5",
        selected ? "border-primary bg-primary/10" : "border-border bg-card",
      )}
      // One owner of `onKeyDown`. RNW activates neither a checkbox nor a radio
      // on Space, so a chip outside a roving group needs its own handler; inside
      // one, the group's item props already carry it.
      {...(rovingProps ?? spaceKeyActivationProps(onToggle))}
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

/**
 * The same chip, read-only — what a *recorded* selection looks like once it is no
 * longer editable (#741).
 *
 * Deliberately identical to `SelectableChip`'s selected state rather than a `Badge`:
 * the entry detail screen shows the emotions the user picked on the form directly
 * above it, and a different shape for the same fact would read as a different fact.
 *
 * The design fills these with `hsl(var(--be) / 0.1)` and inks them `hsl(var(--be))`.
 * That is the pattern #691 named a regression and #368 measured at 3.81:1, so the
 * ink is `text-primary-ink` here as it is on the form.
 */
export function StaticChip({ label, emoji }: { label: string; emoji?: string }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1.5">
      {emoji ? (
        <Text aria-hidden className="text-[14px] leading-none">
          {emoji}
        </Text>
      ) : null}
      <Text className="text-[13px] font-semibold text-primary-ink">{label}</Text>
    </View>
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
