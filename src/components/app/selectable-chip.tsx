import { Pressable, View } from "react-native";

import { cn } from "@/lib/utils";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP, spaceKeyActivationProps } from "@/src/lib/accessibility";
import type { RovingItemProps } from "@/src/lib/roving-focus";
import { ReservedSpace } from "@/src/components/app/reserved-space";

/**
 * The chip's frame and type, shared by the three things that have to be exactly the same
 * size: the togglable chip, the read-only one, and the silhouette that holds a run's space
 * while it loads. ADR-0009's reservation is only exact if the invisible copy is built from
 * the same constants as the real chip — a second literal here is a drift waiting to happen,
 * and `NotificationRowSkeleton` exists because a skeleton 20px short of its row is "a layout
 * jump dressed up as a loading state" (#981).
 *
 * ☠️ `font-semibold` is part of the *selected* type, not decoration: a selected label is
 * measurably wider than an unselected one, so a silhouette that ignored the selection would
 * reserve the wrong width and re-wrap the run the moment the real chips arrived.
 */
export const CHIP_FRAME = "flex-row items-center gap-1.5 rounded-full border px-3 py-1.5";
export const CHIP_UNSELECTED_FRAME = "border-border bg-card";
export const CHIP_SELECTED_FRAME = "border-primary bg-primary/10";
export const CHIP_EMOJI_TYPE = "text-[14px] leading-none";
export const CHIP_LABEL_TYPE = "text-[13px]";
export const CHIP_SELECTED_LABEL_TYPE = "font-semibold text-primary-ink";
export const CHIP_UNSELECTED_LABEL_TYPE = "text-foreground";

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
      className={cn(CHIP_FRAME, selected ? CHIP_SELECTED_FRAME : CHIP_UNSELECTED_FRAME)}
      // One owner of `onKeyDown`. RNW activates neither a checkbox nor a radio
      // on Space, so a chip outside a roving group needs its own handler; inside
      // one, the group's item props already carry it.
      {...(rovingProps ?? spaceKeyActivationProps(onToggle))}
    >
      {emoji ? (
        // Decorative: the label already carries the name, and announcing the
        // glyph would read the emotion twice.
        <Text aria-hidden className={CHIP_EMOJI_TYPE}>
          {emoji}
        </Text>
      ) : null}
      <Text
        className={cn(
          CHIP_LABEL_TYPE,
          selected ? CHIP_SELECTED_LABEL_TYPE : CHIP_UNSELECTED_LABEL_TYPE,
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
    <View className={cn(CHIP_FRAME, CHIP_SELECTED_FRAME)}>
      {emoji ? (
        <Text aria-hidden className={CHIP_EMOJI_TYPE}>
          {emoji}
        </Text>
      ) : null}
      <Text className={cn(CHIP_LABEL_TYPE, CHIP_SELECTED_LABEL_TYPE)}>{label}</Text>
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

interface ChipRunReservationProps {
  /** The run's likeliest contents, used for their SIZE and never for their meaning. */
  chips: { id: string; label: string; emoji?: string }[];
  /** Mirrors the selected type, which is wider — see `CHIP_SELECTED_LABEL_TYPE`. */
  selectedIds?: string[];
  /** The visible loading signal, centred in the held space. Usually a spinner. */
  overlay?: React.ReactNode;
  className?: string;
  testID?: string;
}

/**
 * A chip run's SPACE, held while the chips that will fill it are still being fetched —
 * ADR-0009 clause 2, applied to the one shape in this app whose height is a wrap rather
 * than a count.
 *
 * The chips here are `View`s, not `SelectableChip`s, and that is deliberate twice over.
 * They are not interactive, so an invisible tap target cannot exist; and they draw no
 * fill, because **the number of chips is exactly the fact the query is going to tell us**.
 * Twenty-two grey pills would say "twenty-two are coming" to a reader who has pruned the
 * list to five — a claim, and clause 1 forbids claims a loading surface cannot back.
 * The space is held, a spinner says it is loading, and nothing else is asserted.
 *
 * `ReservedSpace` takes care of the accessibility hiding, which matters more here than the
 * pointer events: these labels are real words, and a screen reader would otherwise read the
 * whole run out before it existed.
 */
export function ChipRunReservation({
  chips,
  selectedIds,
  overlay,
  className,
  testID,
}: ChipRunReservationProps) {
  return (
    <ReservedSpace overlay={overlay} className={className} testID={testID}>
      <ChipRun>
        {chips.map((chip) => {
          const selected = selectedIds?.includes(chip.id) ?? false;
          return (
            <View
              key={chip.id}
              className={cn(CHIP_FRAME, selected ? CHIP_SELECTED_FRAME : CHIP_UNSELECTED_FRAME)}
            >
              {chip.emoji ? <Text className={CHIP_EMOJI_TYPE}>{chip.emoji}</Text> : null}
              <Text
                className={cn(
                  CHIP_LABEL_TYPE,
                  selected ? CHIP_SELECTED_LABEL_TYPE : CHIP_UNSELECTED_LABEL_TYPE,
                )}
              >
                {chip.label}
              </Text>
            </View>
          );
        })}
      </ChipRun>
    </ReservedSpace>
  );
}
