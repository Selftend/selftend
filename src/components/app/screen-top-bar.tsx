import { View } from "react-native";

import { cn } from "@/lib/utils";
import { ScreenBreadcrumb } from "@/src/components/app/screen-breadcrumb";

interface ScreenTopBarProps {
  /**
   * The leading glyph. "close" on a create/edit form (the design's `2b`),
   * "back" on a detail screen (`2c`). Both climb one step up the trail - the
   * difference is what the affordance promises, not where it goes.
   */
  leading?: "back" | "close";
  className?: string;
}

/**
 * The 48px form/detail bar (#733, decided on #690).
 *
 * Replaces `ModuleHomeHeader variant="field"` on the seven form and detail
 * screens - which is the half of the old header's population the ticket's
 * "ten module homes" framing doesn't name: `ModuleHomeHeader` had 17 call
 * sites, not 10, and a form was rendering a full-bleed hue field with a
 * 40px display title above a text input.
 *
 * Measurements are read off the design (`2b`/`2c`): 48px tall, `--card` on
 * `--background`, one bottom hairline, a muted glyph and the uppercase trail,
 * `padding: 0 20px`. The trail rides the bar's left edge rather than the form
 * column below it - it is chrome for the screen, not part of the document.
 *
 * The trail itself is `ScreenBreadcrumb`, so the bar inherits the structural
 * up-hop, the crumb links and the "hide a lone crumb" rule instead of
 * reimplementing them. That keeps the glyph at 16px and the gap at 8px where
 * the design draws 18px/10px: chasing those two would change the breadcrumb
 * everywhere it renders, including in `ScreenHeader`, to buy 2px here.
 */
export function ScreenTopBar({ leading = "back", className }: ScreenTopBarProps) {
  return (
    <View
      testID="screen-top-bar"
      className={cn("h-12 justify-center border-b border-border bg-card px-5", className)}
    >
      <ScreenBreadcrumb backIcon={leading === "close" ? "close" : "arrow-back"} />
    </View>
  );
}
