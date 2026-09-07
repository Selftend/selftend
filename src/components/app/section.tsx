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
   * Heading level for the label. Defaults to 3.
   *
   * ☠️ The default is load-bearing: it is what leaves every shipped call site,
   * and the tool redesigns still queued, untouched by this prop existing. Pass a
   * level only where the surrounding outline demands it - `/faq` passes 2
   * because its group labels sit above questions that are themselves level 3
   * (#2142), and a level-3 label over level-3 content is an outline running
   * sideways rather than down.
   *
   * Typed as the six real heading levels rather than `number`: `level={0}` would
   * otherwise typecheck and reach the tree as an invalid `aria-level`, and the
   * default is a default PARAMETER, so `0` would survive it rather than fall
   * back to 3. It cannot stop a caller skipping a level - only the caller knows
   * the surrounding outline - but it can stop one that is not a level at all.
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
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
 * Shipped **unused on purpose** and has since been taken up widely - the
 * check-in overview (#735) and entry detail (#741) were the first consumers,
 * and the tool and module homes followed. The bet was that landing the shape
 * before its callers would let them inherit a shared thing rather than each
 * inventing a near-identical local `View` with its own padding and its own idea
 * of where the hairline goes; that is what happened, so the sentence is kept as
 * a record rather than deleted. Redesigns are still queued behind it.
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
export function Section({
  children,
  title,
  action,
  ruled = true,
  level = 3,
  className,
}: SectionProps) {
  return (
    <View
      testID="section"
      className={cn("gap-4 py-6", ruled && "border-t border-border", className)}
    >
      {title || action ? (
        <View testID="section-label-row" className="flex-row items-center justify-between gap-3">
          {title ? (
            // A heading, styled quiet - not a quiet piece of text. The eyebrow is
            // a visual decision; dropping the role would take the sections out of
            // the heading outline entirely, which is what a screen-reader user
            // navigates this page by. The callers it replaces were `variant="h3"`,
            // so level 3 is the DEFAULT and keeps the outline they already had.
            //
            // It became a prop on #2142 rather than a constant because the level
            // depends on what surrounds the section, which only the caller knows:
            // `/faq` groups sit above level-3 questions and so label at 2. The
            // default is what keeps that additive - no shipped call site passes it.
            <Text
              role="heading"
              aria-level={level}
              className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
            >
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
