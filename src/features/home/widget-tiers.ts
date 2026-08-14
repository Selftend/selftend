import { useMemo } from "react";

import type { WidgetPreference } from "@/src/features/home/types";
import { isImplemented, metaForWidget } from "@/src/features/home/widget-registry";

/**
 * The `Guided programmes` tier's fixed order, CBT then ACT (#977) - deliberately NOT
 * `position` order like the tool tier. Onboarding writes these ids in the order the user
 * tapped the module chips, so `position` would seat ACT first for anyone who picked it
 * first, and the tier is two cards with no reason to vary.
 *
 * ⚠️ It follows that the programme tier is not user-orderable, and #980's arrange screen
 * honours that (owner decision, 2026-08-14): programme rows get remove and re-add, and no
 * drag handle. A drag that writes a `position` the renderer then ignores is the
 * row-snaps-back lie #975 removed from the tool tier.
 */
export const PROGRAMME_ORDER = ["cbt-programme", "act-programme"];

export interface WidgetTiers {
  /** Every owned id this build can render, in `position` order. */
  widgetIds: string[];
  toolIds: string[];
  programmeIds: string[];
}

/**
 * One ordered list, partitioned by tier (#950).
 *
 * `widget_preferences` keeps a single `position` sequence; which tier an id belongs to is
 * declared by the registry, so the renderer partitions rather than the table growing a
 * column.
 *
 * Shared by home and arrange rather than restated in each. They must agree on the
 * partition or the screens lie to each other - arrange would offer a handle on a row home
 * seats by a different rule, which is the snap-back defect in a new costume. Before this
 * existed, adding a programme id or a third tier meant editing both files and hoping.
 */
export function useWidgetTiers(preferences: WidgetPreference[] | undefined): WidgetTiers {
  const widgetIds = useMemo(
    () => (preferences ?? []).map((preference) => preference.widgetId).filter(isImplemented),
    [preferences],
  );

  const toolIds = useMemo(
    () => widgetIds.filter((id) => metaForWidget(id)?.tier === "tool"),
    [widgetIds],
  );

  const programmeIds = useMemo(
    () =>
      PROGRAMME_ORDER.filter(
        (id) => widgetIds.includes(id) && metaForWidget(id)?.tier === "programme",
      ),
    [widgetIds],
  );

  return { widgetIds, toolIds, programmeIds };
}
