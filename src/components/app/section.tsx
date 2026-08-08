import type { ReactNode } from "react";
import { View } from "react-native";

import { cn } from "@/lib/utils";
import { Text } from "@/src/components/react-native-reusables/text";

interface SectionProps {
  children: ReactNode;
  /** Optional label above the section body, e.g. "Mood trend". Rendered uppercase. */
  title?: string;
  /** Optional trailing control on the label row (a range switch, a "show all" link). */
  action?: ReactNode;
  /**
   * Draw the top hairline. Defaults to true. Pass `false` for the first section
   * under a header, where the rule would sit directly beneath the stats row and
   * read as an underline for it rather than as a divider.
   */
  ruled?: boolean;
  className?: string;
}

/**
 * The hairline section that replaces the card-in-card stack (#733, decided on
 * #690).
 *
 * Shipped **unused on purpose**. Eight tool redesigns are queued behind this
 * one and each needs the same shape; landing it here means they inherit a
 * shared thing instead of each inventing a near-identical local `View` with its
 * own padding and its own idea of where the hairline goes. Its first consumers
 * are the check-in overview (#735) and entry detail (#741).
 *
 * A hairline rather than a card because the surfaces stack: the design's `2a`
 * runs four sections down one column, and four bordered cards on a background
 * read as four competing panels rather than one page.
 *
 * The label is the design's section eyebrow - 11px, 600, 0.1em-tracked,
 * uppercase, muted - not a heading scale. It is deliberately quieter than the
 * content it introduces, which is what lets four of them stack without the page
 * reading as four pages.
 */
export function Section({ children, title, action, ruled = true, className }: SectionProps) {
  return (
    <View
      testID="section"
      className={cn("gap-4 py-6", ruled && "border-t border-border", className)}
    >
      {title || action ? (
        <View testID="section-label-row" className="flex-row items-center justify-between gap-3">
          {title ? (
            <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}
