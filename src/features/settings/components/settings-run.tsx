import { Children, type ReactNode } from "react";
import { View } from "react-native";

import { SettingsGroupLabel } from "@/src/features/settings/components/settings-group-label";
import { cn } from "@/lib/utils";

interface SettingsRunProps {
  /**
   * The run's name: `App`, `Your data`, `Help`, `Account`.
   *
   * Optional, for the one run that has nothing to be told apart from: the profile
   * panel sits directly under the identity header it belongs to. It shares this
   * component rather than restating the card chrome and the hairline rule, so the
   * two cannot drift into looking like different kinds of thing.
   */
  label?: string;
  children: ReactNode;
  /**
   * What the rows sit on. `card` (the default) is the settings page: a bordered,
   * filled panel with its own inset. `hairline` (#1725) is for a run that lives
   * inside a titled `Section`, where the section already carries the chrome - a
   * card there would be a box inside a box, so the run draws nothing of its own
   * and keeps only the eyebrow and the rules between rows.
   */
  surface?: "card" | "hairline";
  testID?: string;
}

/**
 * One run of settings rows - an optional name, then its rows on a single card
 * separated by hairlines.
 *
 * Four labelled ones replace seven `SettingsSectionCard`s. A card gave each
 * section an icon badge, a title and a description, which meant the page's
 * structure was carried three times over; a run carries it once, in the label,
 * and lets the rows be rows.
 *
 * ⚠️ `Children.toArray` drops a `null` CHILD, but not a child element that
 * returns `null` once rendered. A platform-gated row must therefore be gated at
 * its mount point (`{Platform.OS === "web" ? null : <AppLockRow />}`) and never
 * by hiding itself, or its slot survives as a rule with nothing under it. This
 * holds on either surface: a hairline run has no border to hide a stray rule
 * against, so the empty slot would read as a rule with nothing under it there too.
 */
export function SettingsRun({ label, children, surface = "card", testID }: SettingsRunProps) {
  const rows = Children.toArray(children);
  const card = surface === "card";

  return (
    <View className="gap-2">
      {/*
        The run's name goes through the shared `SettingsGroupLabel` (#1828),
        which owns the heading role and the kit's eyebrow scale. The appearance
        group renders the same component, so the two cannot drift.
      */}
      {label ? (
        // The eyebrow's inset is optical, against the card's rounded edge; with no
        // card it sits on the same left edge as the rows' glyphs.
        <SettingsGroupLabel className={cn(card && "px-1")}>{label}</SettingsGroupLabel>
      ) : null}
      <View
        className={cn(
          card && "rounded-xl border border-border bg-card px-4",
          // A hairline run's closing rule. The card's own bottom border ends the
          // run; with no card the last row would stop mid-air, so the run draws
          // the rule both drawings put there. Guarded on actually having rows, so
          // a run whose every child is gated away leaves nothing behind.
          !card && rows.length > 0 && "border-b border-border",
        )}
        testID={testID}
      >
        {rows.map((row, index) => (
          <View
            key={index}
            /*
              On a card, hairlines sit BETWEEN rows only: a leading rule would
              read as a fifth, empty row against the card's own border. That
              reasoning belongs to the card and expires with it (#1800) - a
              hairline run has no border for a rule to fight, and `13a` and `14a`
              both rule above every row including the first.

              `Children.toArray` still drops a `null` child on either surface, so
              a mount-point-gated row leaves no rule with nothing under it.
            */
            className={cn((!card || index > 0) && "border-t border-border")}
          >
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}
