import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";
import type { WidgetTint } from "@/src/features/widgets/widget-tint";

export interface WidgetMeta {
  id: string;
  toolKey: string;
  icon: MaterialIconName;
  titleKey: string;
  /**
   * No `t()` call site reads this today. It stays declared on every entry, and
   * widget-meta.test.ts asserts it resolves in both locales, because a declared key
   * that resolves to nothing is a trap for the next reader who trusts the declaration.
   */
  descriptionKey: string;
  tint: WidgetTint;
}

// The 25-id widget catalogue (#972), owned by the Android launcher since #1952:
// `CARD_IDS` in snapshot-types.ts is exactly this key set, the config screen
// lists it, and widget-meta.test.ts holds the two in step.
//
// Identity, `tint` and `toolKey` are all an entry carries (#1959). `tier`,
// `status` and `route` died with Home's last reader: the launcher builds its own
// paths in snapshot-builder.ts and never read `meta.route`, and the tier and the
// default/available split only ever meant something to the in-app dashboard.
//
// `tint` stays here because the launcher renders it; the in-app redesign never
// renders it as colour (rule 1: no colour varies by item on an identity surface).
export const WIDGET_META: Record<string, WidgetMeta> = {
  "mood-checkin": {
    id: "mood-checkin",
    toolKey: "mood",
    icon: "mood",
    titleKey: "home.widgets.moodCheckin.title",
    descriptionKey: "home.widgets.moodCheckin.desc",
    tint: "be",
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
  },
  "gratitude-latest": {
    id: "gratitude-latest",
    toolKey: "gratitude",
    icon: "favorite",
    titleKey: "home.widgets.gratitudeLatest.title",
    descriptionKey: "home.widgets.gratitudeLatest.desc",
    tint: "think",
  },
  "meditation-pick": {
    id: "meditation-pick",
    toolKey: "meditation",
    icon: "self-improvement",
    titleKey: "home.widgets.meditationPick.title",
    descriptionKey: "home.widgets.meditationPick.desc",
    tint: "iris",
  },
  "habits-today": {
    id: "habits-today",
    toolKey: "habits",
    icon: "task-alt",
    titleKey: "home.widgets.habitsToday.title",
    descriptionKey: "home.widgets.habitsToday.desc",
    tint: "act",
  },
  "self-care": {
    id: "self-care",
    toolKey: "cbt",
    icon: "spa",
    titleKey: "home.widgets.selfCare.title",
    descriptionKey: "home.widgets.selfCare.desc",
    tint: "primary",
  },
  "cbt-open-record": {
    id: "cbt-open-record",
    toolKey: "cbt",
    icon: "psychology",
    titleKey: "home.widgets.cbtOpenRecord.title",
    descriptionKey: "home.widgets.cbtOpenRecord.metaDesc",
    tint: "primary",
  },
  "act-drop-anchor": {
    id: "act-drop-anchor",
    toolKey: "act",
    icon: "anchor",
    titleKey: "home.widgets.actDropAnchor.title",
    descriptionKey: "home.widgets.actDropAnchor.metaDesc",
    tint: "act",
  },
  "act-observing-self": {
    id: "act-observing-self",
    toolKey: "act",
    icon: "visibility",
    titleKey: "home.widgets.actObservingSelf.title",
    descriptionKey: "home.widgets.actObservingSelf.metaDesc",
    tint: "act",
  },
  "act-choice-point": {
    id: "act-choice-point",
    toolKey: "act",
    icon: "alt-route",
    titleKey: "home.widgets.actChoicePoint.title",
    descriptionKey: "home.widgets.actChoicePoint.metaDesc",
    tint: "act",
  },
  "sleep-latest": {
    id: "sleep-latest",
    toolKey: "sleep",
    icon: "bedtime",
    titleKey: "home.widgets.sleepLatest.title",
    descriptionKey: "home.widgets.sleepLatest.desc",
    tint: "ink",
  },
  "cbt-distortion-guide": {
    id: "cbt-distortion-guide",
    toolKey: "cbt",
    icon: "menu-book",
    titleKey: "home.widgets.cbtDistortionGuide.title",
    descriptionKey: "home.widgets.cbtDistortionGuide.metaDesc",
    tint: "primary",
  },
  "cbt-programme": {
    id: "cbt-programme",
    toolKey: "cbt",
    icon: "school",
    titleKey: "home.widgets.cbtProgramme.title",
    descriptionKey: "home.widgets.cbtProgramme.metaDesc",
    tint: "primary",
  },
  "act-programme": {
    id: "act-programme",
    toolKey: "act",
    icon: "school",
    titleKey: "home.widgets.actProgramme.title",
    descriptionKey: "home.widgets.actProgramme.metaDesc",
    tint: "act",
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
  },
  "cbt-beliefs": {
    id: "cbt-beliefs",
    toolKey: "cbt",
    icon: "anchor",
    titleKey: "home.widgets.cbtBeliefs.title",
    descriptionKey: "home.widgets.cbtBeliefs.metaDesc",
    tint: "primary",
  },
  "cbt-activities": {
    id: "cbt-activities",
    toolKey: "cbt",
    icon: "directions-run",
    titleKey: "home.widgets.cbtActivities.title",
    descriptionKey: "home.widgets.cbtActivities.metaDesc",
    tint: "primary",
  },
  "cbt-exposure": {
    id: "cbt-exposure",
    toolKey: "cbt",
    icon: "layers",
    titleKey: "home.widgets.cbtExposure.title",
    descriptionKey: "home.widgets.cbtExposure.metaDesc",
    tint: "primary",
  },
  "cbt-goals": {
    id: "cbt-goals",
    toolKey: "cbt",
    icon: "gps-fixed",
    titleKey: "home.widgets.cbtGoals.title",
    descriptionKey: "home.widgets.cbtGoals.metaDesc",
    tint: "primary",
  },
  "act-committed-actions": {
    id: "act-committed-actions",
    toolKey: "act",
    icon: "checklist",
    titleKey: "home.widgets.actCommittedActions.title",
    descriptionKey: "home.widgets.actCommittedActions.metaDesc",
    tint: "act",
  },
  "act-defusion": {
    id: "act-defusion",
    toolKey: "act",
    icon: "filter-drama",
    titleKey: "home.widgets.actDefusion.title",
    descriptionKey: "home.widgets.actDefusion.metaDesc",
    tint: "act",
  },
  "act-acceptance-prompt": {
    id: "act-acceptance-prompt",
    toolKey: "act",
    icon: "open-in-full",
    titleKey: "home.widgets.actAcceptancePrompt.title",
    descriptionKey: "home.widgets.actAcceptancePrompt.metaDesc",
    tint: "act",
  },
  "journal-week": {
    id: "journal-week",
    toolKey: "journal",
    icon: "date-range",
    titleKey: "home.widgets.journalWeek.title",
    descriptionKey: "home.widgets.journalWeek.metaDesc",
    tint: "ink",
  },
  "grounding-log": {
    id: "grounding-log",
    toolKey: "grounding",
    icon: "history",
    titleKey: "home.widgets.groundingLog.title",
    descriptionKey: "home.widgets.groundingLog.metaDesc",
    tint: "clay",
  },
  // routines-today must stay out of every auto-seeding surface
  // (SHARED_TOOL_WIDGET_IDS, concern widgets): Home was something the user chose,
  // and the launcher offers it like any other id (spec #37 / #50).
  "routines-today": {
    id: "routines-today",
    toolKey: "routines",
    icon: "repeat",
    titleKey: "routines:widget.metaTitle",
    descriptionKey: "routines:widget.metaDesc",
    tint: "iris",
  },
};

export function metaForWidget(widgetId: string): WidgetMeta | undefined {
  return WIDGET_META[widgetId];
}
