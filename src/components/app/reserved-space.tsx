import { View } from "react-native";

import { cn } from "@/lib/utils";

/**
 * The fill a loading placeholder is drawn with, where it is drawn at all.
 *
 * ☠️ **Never `bg-muted`.** It measures about 1.10:1 on a card and is simply invisible
 * (#725) — and it is the obviously-named token anyone reaching for "a grey bar" will
 * pick first. `muted-foreground/25` measures 1.41 light / 1.68 dark: faint on purpose,
 * but there. This is a property of the token rather than of any one surface, which is
 * why it lives here instead of being re-derived per site (ADR-0009, edge 3).
 */
export const LOADING_FILL = "bg-muted-foreground/25";

interface ReservedSpaceProps {
  /**
   * The REAL content, rendered at `opacity-0`. It is here for its size and nothing else:
   * because it is the same components with the same frame constants and the same type,
   * it cannot drift from the thing it stands in for, and no pixel number has to be
   * measured or remembered.
   */
  children: React.ReactNode;
  /**
   * What the reader actually sees in the reserved space — a spinner, or a fill built
   * from {@link LOADING_FILL}. Centred over the stick, and optional.
   *
   * ☠️ **A visible fill is itself a claim**: it says content is coming, and how much of
   * it. Pass one only where arrival is guaranteed — the row exists and only its data is
   * pending. Where the *set* is what is being fetched, its size is a fact we do not have,
   * so reserve blank or hold the space around a contentless signal instead (ADR-0009,
   * edge 2).
   */
  overlay?: React.ReactNode;
  className?: string;
  testID?: string;
}

/**
 * Hold the space a pending surface will occupy, without claiming anything about what will
 * land in it — ADR-0009 clause 2, in the shape clause 1 permits.
 *
 * The technique is `NotificationRowSkeleton`'s, lifted out of it so the remaining
 * conversions do not each re-invent it: **the real content at `opacity-0` underneath, the
 * visible loading signal on top.** The invisible copy is a measuring stick, so the
 * reservation is exact by construction rather than by a constant somebody has to keep in
 * step — see #981, where a skeleton that was 20px short was "a layout jump dressed up as
 * a loading state".
 *
 * Two things the stick forces, both handled here so a caller cannot forget them:
 *
 * - ☠️ **It is hidden from the accessibility tree on all three platforms.** The stick
 *   holds real words — names, labels, numbers — and words in the DOM are words a screen
 *   reader reads out. `accessibilityElementsHidden` and `importantForAccessibility` cover
 *   iOS and Android; `aria-hidden` covers web, where react-native-web implements neither
 *   of the other two. Same belt-and-braces as `Icon`.
 * - ☠️ **It takes no pointer events.** `opacity-0` hides a control from the eye and from
 *   nothing else: on web an invisible `Pressable` is still perfectly clickable, which
 *   would turn a reservation meant to protect a tap into a way of stealing one.
 */
export function ReservedSpace({ children, overlay, className, testID }: ReservedSpaceProps) {
  return (
    <View className={cn("relative", className)} testID={testID}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
        pointerEvents="none"
        className="opacity-0"
      >
        {children}
      </View>
      {overlay ? (
        // `box-none` so the overlay itself never swallows a press meant for whatever the
        // caller puts in it - the signal is usually inert, but a retry affordance is not.
        <View pointerEvents="box-none" className="absolute inset-0 items-center justify-center">
          {overlay}
        </View>
      ) : null}
    </View>
  );
}
