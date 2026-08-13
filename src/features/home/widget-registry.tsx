import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";
import type { WidgetTint } from "@/src/features/home/widget-tint";

import { CbtProgrammeWidget } from "@/src/features/home/widgets/cbt-programme-widget";
import { ActProgrammeWidget } from "@/src/features/home/widgets/act-programme-widget";

type WidgetComponent = React.ComponentType<{ userId: string }>;
type WidgetStatus = "default" | "available" | "soon";

/** Which of home's tiers an id renders in. `Right now` is derived, not id-driven. */
export type WidgetTier = "tool" | "programme";

export interface WidgetMeta {
  id: string;
  toolKey: string;
  icon: MaterialIconName;
  titleKey: string;
  descriptionKey: string;
  tint: WidgetTint;
  status: WidgetStatus;
  /**
   * Where the row navigates. Required, so a new id cannot be added without
   * declaring its destination. Asserted against the real `app/` tree in
   * widget-registry.test.tsx.
   */
  route: string;
  tier: WidgetTier;
}

/**
 * Card components for the ids that still render as cards - now exactly the two
 * `programme` ids, whose card #977 reshapes. #975 moved the nine tool ids to `ToolRow`
 * and #976 took the remaining fourteen, so the whole `tool` tier is rows.
 *
 * This is NOT the dashboard catalogue - `WIDGET_META` is, and it still holds all 25 ids.
 * Anything asking "does this id exist" or "where does it go" reads the meta; the Android
 * launcher's `CARD_REPLICAS` mirrors the meta too, which is why it is unaffected by every
 * deletion above.
 */
export const WIDGET_REGISTRY: Record<string, WidgetComponent> = {
  "cbt-programme": CbtProgrammeWidget,
  "act-programme": ActProgrammeWidget,
};

// The dashboard catalogue (#972). Routes come from the decided spec's 24-row
// table, with two corrections the router forced: the table wrote
// `/tools/gratitude` and `/tools/routines`, and neither exists - the shipped
// screens are `/tools/gratitude-log` and `/routines` (top level, not under
// tools). The test asserts every route against the real `app/` tree.
//
// `tint` stays here because the Android snapshot mirrors and asserts it, but
// this redesign never renders it as colour (rule 1: no colour varies by item
// on an identity surface).
export const WIDGET_META: Record<string, WidgetMeta> = {
  "mood-checkin": {
    id: "mood-checkin",
    toolKey: "mood",
    icon: "mood",
    titleKey: "home.widgets.moodCheckin.title",
    descriptionKey: "home.widgets.moodCheckin.desc",
    tint: "be",
    status: "default",
    route: "/tools/check-in",
    tier: "tool",
  },
  // `mood-trend` retired into `mood-checkin` here in S3 (#973): both its
  // numbers live on the check-in row and it already navigated to the same
  // screen, so it was a second row to the same place. Stored rows were
  // collapsed by 20260813000000_collapse_legacy_widget_ids.sql.
  "breathing-suggested": {
    id: "breathing-suggested",
    toolKey: "breathing",
    icon: "air",
    titleKey: "home.widgets.breathingSuggested.title",
    descriptionKey: "home.widgets.breathingSuggested.desc",
    tint: "aqua",
    status: "default",
    route: "/tools/breathing",
    tier: "tool",
  },
  "gratitude-latest": {
    id: "gratitude-latest",
    toolKey: "gratitude",
    icon: "favorite",
    titleKey: "home.widgets.gratitudeLatest.title",
    descriptionKey: "home.widgets.gratitudeLatest.desc",
    tint: "think",
    status: "default",
    route: "/tools/gratitude-log",
    tier: "tool",
  },
  "meditation-pick": {
    id: "meditation-pick",
    toolKey: "meditation",
    icon: "self-improvement",
    titleKey: "home.widgets.meditationPick.title",
    descriptionKey: "home.widgets.meditationPick.desc",
    tint: "iris",
    status: "default",
    route: "/tools/meditation",
    tier: "tool",
  },
  "habits-today": {
    id: "habits-today",
    toolKey: "habits",
    icon: "task-alt",
    titleKey: "home.widgets.habitsToday.title",
    descriptionKey: "home.widgets.habitsToday.desc",
    tint: "act",
    status: "default",
    route: "/tools/habits",
    tier: "tool",
  },
  "self-care": {
    id: "self-care",
    toolKey: "cbt",
    icon: "spa",
    titleKey: "home.widgets.selfCare.title",
    descriptionKey: "home.widgets.selfCare.desc",
    tint: "primary",
    status: "available",
    route: "/modules/cbt/self-care",
    tier: "tool",
  },
  "cbt-open-record": {
    id: "cbt-open-record",
    toolKey: "cbt",
    icon: "psychology",
    titleKey: "home.widgets.cbtOpenRecord.title",
    descriptionKey: "home.widgets.cbtOpenRecord.metaDesc",
    tint: "primary",
    status: "default",
    route: "/modules/cbt/new",
    tier: "tool",
  },
  "act-drop-anchor": {
    id: "act-drop-anchor",
    toolKey: "act",
    icon: "anchor",
    titleKey: "home.widgets.actDropAnchor.title",
    descriptionKey: "home.widgets.actDropAnchor.metaDesc",
    tint: "act",
    status: "default",
    route: "/modules/act/connection/drop-anchor",
    tier: "tool",
  },
  "act-observing-self": {
    id: "act-observing-self",
    toolKey: "act",
    icon: "visibility",
    titleKey: "home.widgets.actObservingSelf.title",
    descriptionKey: "home.widgets.actObservingSelf.metaDesc",
    tint: "act",
    status: "available",
    route: "/modules/act/observing-self",
    tier: "tool",
  },
  "act-choice-point": {
    id: "act-choice-point",
    toolKey: "act",
    icon: "alt-route",
    titleKey: "home.widgets.actChoicePoint.title",
    descriptionKey: "home.widgets.actChoicePoint.metaDesc",
    tint: "act",
    status: "available",
    route: "/modules/act/choice-point/new",
    tier: "tool",
  },
  "sleep-latest": {
    id: "sleep-latest",
    toolKey: "sleep",
    icon: "bedtime",
    titleKey: "home.widgets.sleepLatest.title",
    descriptionKey: "home.widgets.sleepLatest.desc",
    tint: "ink",
    status: "default",
    route: "/tools/sleep",
    tier: "tool",
  },
  "cbt-distortion-guide": {
    id: "cbt-distortion-guide",
    toolKey: "cbt",
    icon: "menu-book",
    titleKey: "home.widgets.cbtDistortionGuide.title",
    descriptionKey: "home.widgets.cbtDistortionGuide.metaDesc",
    tint: "primary",
    status: "available",
    route: "/modules/cbt/learn",
    tier: "tool",
  },
  "cbt-programme": {
    id: "cbt-programme",
    toolKey: "cbt",
    icon: "school",
    titleKey: "home.widgets.cbtProgramme.title",
    descriptionKey: "home.widgets.cbtProgramme.metaDesc",
    tint: "primary",
    status: "available",
    route: "/modules/cbt",
    tier: "programme",
  },
  "act-programme": {
    id: "act-programme",
    toolKey: "act",
    icon: "school",
    titleKey: "home.widgets.actProgramme.title",
    descriptionKey: "home.widgets.actProgramme.metaDesc",
    tint: "act",
    status: "available",
    route: "/modules/act",
    tier: "programme",
  },
  // Both `-module-shortcut` ids retired into their `-programme` id here in S3
  // (#973). A shortcut was a card carrying the module's name and a button to
  // its home - which is what the module's own row does - and it pointed at the
  // route its `-programme` sibling already pointed at.
  "cbt-worry": {
    id: "cbt-worry",
    toolKey: "cbt",
    icon: "psychology",
    titleKey: "home.widgets.cbtWorry.title",
    descriptionKey: "home.widgets.cbtWorry.metaDesc",
    tint: "primary",
    status: "available",
    route: "/modules/cbt/worry/new",
    tier: "tool",
  },
  "cbt-beliefs": {
    id: "cbt-beliefs",
    toolKey: "cbt",
    icon: "anchor",
    titleKey: "home.widgets.cbtBeliefs.title",
    descriptionKey: "home.widgets.cbtBeliefs.metaDesc",
    tint: "primary",
    status: "available",
    route: "/modules/cbt/beliefs/new",
    tier: "tool",
  },
  "cbt-activities": {
    id: "cbt-activities",
    toolKey: "cbt",
    icon: "directions-run",
    titleKey: "home.widgets.cbtActivities.title",
    descriptionKey: "home.widgets.cbtActivities.metaDesc",
    tint: "primary",
    status: "available",
    route: "/modules/cbt/activities/new",
    tier: "tool",
  },
  "cbt-exposure": {
    id: "cbt-exposure",
    toolKey: "cbt",
    icon: "layers",
    titleKey: "home.widgets.cbtExposure.title",
    descriptionKey: "home.widgets.cbtExposure.metaDesc",
    tint: "primary",
    status: "available",
    route: "/modules/cbt/exposure/new",
    tier: "tool",
  },
  "cbt-goals": {
    id: "cbt-goals",
    toolKey: "cbt",
    icon: "gps-fixed",
    titleKey: "home.widgets.cbtGoals.title",
    descriptionKey: "home.widgets.cbtGoals.metaDesc",
    tint: "primary",
    status: "available",
    route: "/modules/cbt/goals/new",
    tier: "tool",
  },
  "act-committed-actions": {
    id: "act-committed-actions",
    toolKey: "act",
    icon: "checklist",
    titleKey: "home.widgets.actCommittedActions.title",
    descriptionKey: "home.widgets.actCommittedActions.metaDesc",
    tint: "act",
    status: "available",
    route: "/modules/act/committed-action",
    tier: "tool",
  },
  "act-defusion": {
    id: "act-defusion",
    toolKey: "act",
    icon: "filter-drama",
    titleKey: "home.widgets.actDefusion.title",
    descriptionKey: "home.widgets.actDefusion.metaDesc",
    tint: "act",
    status: "available",
    route: "/modules/act/defusion",
    tier: "tool",
  },
  "act-acceptance-prompt": {
    id: "act-acceptance-prompt",
    toolKey: "act",
    icon: "open-in-full",
    titleKey: "home.widgets.actAcceptancePrompt.title",
    descriptionKey: "home.widgets.actAcceptancePrompt.metaDesc",
    tint: "act",
    status: "available",
    route: "/modules/act/expansion",
    tier: "tool",
  },
  "journal-week": {
    id: "journal-week",
    toolKey: "journal",
    icon: "date-range",
    titleKey: "home.widgets.journalWeek.title",
    descriptionKey: "home.widgets.journalWeek.metaDesc",
    tint: "ink",
    status: "available",
    route: "/tools/journal",
    tier: "tool",
  },
  "grounding-log": {
    id: "grounding-log",
    toolKey: "grounding",
    icon: "history",
    titleKey: "home.widgets.groundingLog.title",
    descriptionKey: "home.widgets.groundingLog.metaDesc",
    tint: "clay",
    status: "available",
    route: "/tools/grounding",
    tier: "tool",
  },
  // Deliberately "available", NOT "default" (spec #37 / #50): routines-today
  // is offered in the Add-Widget modal but never default-seeded - unlike
  // habits-today, Home stays something the user chose. It must also stay out
  // of every auto-seeding surface (SHARED_TOOL_WIDGET_IDS, concern widgets).
  "routines-today": {
    id: "routines-today",
    toolKey: "routines",
    icon: "repeat",
    titleKey: "routines:widget.metaTitle",
    descriptionKey: "routines:widget.metaDesc",
    tint: "iris",
    status: "available",
    // Not `/tools/routines` - routines live at the top level of the router.
    route: "/routines",
    tier: "tool",
  },
};

export function metaForWidget(widgetId: string): WidgetMeta | undefined {
  return WIDGET_META[widgetId];
}

/**
 * Whether the dashboard can render this id at all.
 *
 * Re-based on `WIDGET_META` by #975: `WIDGET_REGISTRY` used to hold a card component for
 * every id, so "has a component" and "is in the catalogue" were the same question. The
 * tool tier renders rows straight from the catalogue and needs no component, so the
 * registry is now the *programme and not-yet-converted* half only - asking it would
 * start hiding owned rows the moment a tool widget is deleted.
 *
 * Behaviour is unchanged: every catalogued id was already implemented (the `soon` branch
 * this gates has never rendered, because no meta entry carries that status).
 */
export function isImplemented(widgetId: string): boolean {
  return widgetId in WIDGET_META;
}

export function resolveWidget(widgetId: string, userId: string): React.ReactElement | null {
  const Component = WIDGET_REGISTRY[widgetId];
  if (!Component) return null;
  return <Component userId={userId} />;
}
