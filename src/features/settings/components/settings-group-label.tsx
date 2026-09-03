import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";

interface SettingsGroupLabelProps {
  /** The group's name: `Appearance`, `App`, `Your data`, `Help`, `Account`. */
  children: string;
  className?: string;
}

/**
 * The name above one group of settings - the four labelled runs and the
 * appearance group, which #1827 gave a second control and #1800 took the card
 * off, leaving it the only region on the page with nothing to jump to (#1828).
 *
 * `accessibilityRole="header"` rather than `variant="h2"`: the label is an 11px
 * eyebrow, and h2 would drag the display face and a 30px size along with the
 * heading semantics. The role is the part that matters - five groups a
 * screen-reader user can move between, under the hero's h1.
 *
 * ☠️ The level is explicit because a level-less one is NOT level 2. ARIA says it
 * defaults to 2, but `react-native-web` does not leave it to ARIA: with no
 * `aria-level` it swaps the element for a literal `<h1>`
 * (`propsToAccessibilityComponent.js:44-48`), so the four run labels have been
 * rendering as four more `h1`s beside the hero's. `aria-level={2}` is what makes
 * the outline the `h1` + five `h2`s this group's name was specified to join.
 * (This corrects the premise on #1801, which reads the ARIA default and assumes
 * the registered outline is already clean.)
 *
 * The scale is the design kit's `.eyebrow`: 11px, 600, 0.1em-tracked, uppercase,
 * muted - the same tokens `Section` spells out. Extracting this is what makes
 * that one edit instead of a five-site sweep with a sixth site that has to be
 * left alone: `settings-hero.tsx` uses `Text variant="eyebrow"` for the PAGE
 * eyebrow, which the design keeps at 700 / 0.14em. One variant, two jobs.
 *
 * ☠️ Which is also why the tokens are spelled out rather than written as
 * `variant="eyebrow"` with a weight override. `resolveFontFamily` reads the RAW
 * class list, not the tailwind-merge output, and tests `font-bold` before
 * `font-semibold` - so an overridden eyebrow would render the right CSS weight
 * while loading the 700 face.
 */
export function SettingsGroupLabel({ children, className }: SettingsGroupLabelProps) {
  return (
    <Text
      accessibilityRole="header"
      aria-level={2}
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </Text>
  );
}
