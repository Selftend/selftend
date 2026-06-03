import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";
import type { WidgetTint } from "@/src/features/home/widget-tint";

import { MoodCheckinWidget } from "@/src/features/home/widgets/mood-checkin-widget";
import { MoodTrendWidget } from "@/src/features/home/widgets/mood-trend-widget";
import { BreathingWidget } from "@/src/features/home/widgets/breathing-widget";
import { MeditationWidget } from "@/src/features/home/widgets/meditation-widget";
import { GratitudeWidget } from "@/src/features/home/widgets/gratitude-widget";
import { HabitsWidget } from "@/src/features/home/widgets/habits-widget";
import { SelfCareWidget } from "@/src/features/home/widgets/self-care-widget";
import { SleepLastNightWidget } from "@/src/features/home/widgets/sleep-last-night-widget";
import { Sleep7NightsWidget } from "@/src/features/home/widgets/sleep-7-nights-widget";
import { CbtRecentRecordsWidget } from "@/src/features/home/widgets/cbt-recent-records-widget";
import { CbtDistortionPatternsWidget } from "@/src/features/home/widgets/cbt-distortion-patterns-widget";
import { CbtDistortionGuideWidget } from "@/src/features/home/widgets/cbt-distortion-guide-widget";
import { CbtProgrammeWidget } from "@/src/features/home/widgets/cbt-programme-widget";
import { CbtOpenRecordWidget } from "@/src/features/home/widgets/cbt-open-record-widget";
import { CbtWorryWidget } from "@/src/features/home/widgets/cbt-worry-widget";
import { CbtBeliefsWidget } from "@/src/features/home/widgets/cbt-beliefs-widget";
import { CbtActivitiesWidget } from "@/src/features/home/widgets/cbt-activities-widget";
import { CbtExposureWidget } from "@/src/features/home/widgets/cbt-exposure-widget";
import { CbtGoalsWidget } from "@/src/features/home/widgets/cbt-goals-widget";
import { ActValuesWidget } from "@/src/features/home/widgets/act-values-widget";
import { ActCommittedActionsWidget } from "@/src/features/home/widgets/act-committed-actions-widget";
import { ActDefusionWidget } from "@/src/features/home/widgets/act-defusion-widget";
import { ActProgrammeWidget } from "@/src/features/home/widgets/act-programme-widget";
import { ActAcceptancePromptWidget } from "@/src/features/home/widgets/act-acceptance-prompt-widget";
import { Grounding54321Widget } from "@/src/features/home/widgets/grounding-54321-widget";
import { JournalWeekWidget } from "@/src/features/home/widgets/journal-week-widget";
import { GroundingLibraryWidget } from "@/src/features/home/widgets/grounding-library-widget";
import { GroundingLogWidget } from "@/src/features/home/widgets/grounding-log-widget";
import { GratitudeWeekWidget } from "@/src/features/home/widgets/gratitude-week-widget";
import { GratitudeResurfaceWidget } from "@/src/features/home/widgets/gratitude-resurface-widget";
import { GratitudePromptWidget } from "@/src/features/home/widgets/gratitude-prompt-widget";
import { MeditationSitTimeWidget } from "@/src/features/home/widgets/meditation-sit-time-widget";
import { MeditationContinueWidget } from "@/src/features/home/widgets/meditation-continue-widget";
import { SleepNotesWidget } from "@/src/features/home/widgets/sleep-notes-widget";
import { SleepWindDownWidget } from "@/src/features/home/widgets/sleep-wind-down-widget";
import { HabitsQuietWidget } from "@/src/features/home/widgets/habits-quiet-widget";
import { HabitsOneDeepWidget } from "@/src/features/home/widgets/habits-one-deep-widget";

type WidgetComponent = React.ComponentType<{ userId: string }>;
type WidgetStatus = "default" | "available" | "soon";

export interface WidgetMeta {
  id: string;
  toolKey: string;
  icon: MaterialIconName;
  titleKey: string;
  descriptionKey: string;
  tint: WidgetTint;
  status: WidgetStatus;
}

export const WIDGET_REGISTRY: Record<string, WidgetComponent> = {
  "mood-checkin": MoodCheckinWidget,
  "mood-trend": MoodTrendWidget,
  "breathing-suggested": BreathingWidget,
  "gratitude-latest": GratitudeWidget,
  "meditation-pick": MeditationWidget,
  "habits-today": HabitsWidget,
  "self-care": SelfCareWidget,
  "cbt-open-record": CbtOpenRecordWidget,
  "act-values": ActValuesWidget,
  "grounding-54321": Grounding54321Widget,
  "sleep-last-night": SleepLastNightWidget,
  "sleep-7-nights": Sleep7NightsWidget,
  "cbt-recent-records": CbtRecentRecordsWidget,
  "cbt-distortion-patterns": CbtDistortionPatternsWidget,
  "cbt-distortion-guide": CbtDistortionGuideWidget,
  "cbt-programme": CbtProgrammeWidget,
  "cbt-worry": CbtWorryWidget,
  "cbt-beliefs": CbtBeliefsWidget,
  "cbt-activities": CbtActivitiesWidget,
  "cbt-exposure": CbtExposureWidget,
  "cbt-goals": CbtGoalsWidget,
  "act-committed-actions": ActCommittedActionsWidget,
  "act-defusion": ActDefusionWidget,
  "act-programme": ActProgrammeWidget,
  "act-acceptance-prompt": ActAcceptancePromptWidget,
  "journal-week": JournalWeekWidget,
  "grounding-library": GroundingLibraryWidget,
  "grounding-log": GroundingLogWidget,
  "gratitude-week": GratitudeWeekWidget,
  "gratitude-resurface": GratitudeResurfaceWidget,
  "gratitude-prompt": GratitudePromptWidget,
  "meditation-sit-time": MeditationSitTimeWidget,
  "meditation-continue": MeditationContinueWidget,
  "sleep-notes": SleepNotesWidget,
  "sleep-wind-down": SleepWindDownWidget,
  "habits-quiet": HabitsQuietWidget,
  "habits-one-deep": HabitsOneDeepWidget,
};

export const WIDGET_META: Record<string, WidgetMeta> = {
  "mood-checkin": {
    id: "mood-checkin",
    toolKey: "mood",
    icon: "mood",
    titleKey: "home.widgets.moodCheckin.title",
    descriptionKey: "home.widgets.moodCheckin.desc",
    tint: "be",
    status: "default",
  },
  "mood-trend": {
    id: "mood-trend",
    toolKey: "mood",
    icon: "show-chart",
    titleKey: "home.widgets.moodTrend.title",
    descriptionKey: "home.widgets.moodTrend.desc",
    tint: "be",
    status: "default",
  },
  "breathing-suggested": {
    id: "breathing-suggested",
    toolKey: "breathing",
    icon: "air",
    titleKey: "home.widgets.breathingSuggested.title",
    descriptionKey: "home.widgets.breathingSuggested.desc",
    tint: "aqua",
    status: "default",
  },
  "gratitude-latest": {
    id: "gratitude-latest",
    toolKey: "gratitude",
    icon: "favorite",
    titleKey: "home.widgets.gratitudeLatest.title",
    descriptionKey: "home.widgets.gratitudeLatest.desc",
    tint: "think",
    status: "default",
  },
  "meditation-pick": {
    id: "meditation-pick",
    toolKey: "meditation",
    icon: "self-improvement",
    titleKey: "home.widgets.meditationPick.title",
    descriptionKey: "home.widgets.meditationPick.desc",
    tint: "iris",
    status: "default",
  },
  "habits-today": {
    id: "habits-today",
    toolKey: "habits",
    icon: "task-alt",
    titleKey: "home.widgets.habitsToday.title",
    descriptionKey: "home.widgets.habitsToday.desc",
    tint: "act",
    status: "default",
  },
  "self-care": {
    id: "self-care",
    toolKey: "cbt",
    icon: "spa",
    titleKey: "home.widgets.selfCare.title",
    descriptionKey: "home.widgets.selfCare.desc",
    tint: "primary",
    status: "available",
  },
  "cbt-open-record": {
    id: "cbt-open-record",
    toolKey: "cbt",
    icon: "psychology",
    titleKey: "home.widgets.cbtOpenRecord.title",
    descriptionKey: "home.widgets.cbtOpenRecord.metaDesc",
    tint: "primary",
    status: "default",
  },
  "act-values": {
    id: "act-values",
    toolKey: "act",
    icon: "explore",
    titleKey: "home.widgets.actValues.title",
    descriptionKey: "home.widgets.actValues.metaDesc",
    tint: "act",
    status: "default",
  },
  "grounding-54321": {
    id: "grounding-54321",
    toolKey: "grounding",
    icon: "anchor",
    titleKey: "home.widgets.grounding54321.title",
    descriptionKey: "home.widgets.grounding54321.metaDesc",
    tint: "clay",
    status: "default",
  },
  "sleep-last-night": {
    id: "sleep-last-night",
    toolKey: "sleep",
    icon: "bedtime",
    titleKey: "home.widgets.sleepLastNight.title",
    descriptionKey: "home.widgets.sleepLastNight.metaDesc",
    tint: "ink",
    status: "default",
  },
  "sleep-7-nights": {
    id: "sleep-7-nights",
    toolKey: "sleep",
    icon: "bar-chart",
    titleKey: "home.widgets.sleep7Nights.title",
    descriptionKey: "home.widgets.sleep7Nights.metaDesc",
    tint: "ink",
    status: "default",
  },
  "cbt-recent-records": {
    id: "cbt-recent-records",
    toolKey: "cbt",
    icon: "history",
    titleKey: "home.widgets.cbtRecentRecords.title",
    descriptionKey: "home.widgets.cbtRecentRecords.metaDesc",
    tint: "primary",
    status: "available",
  },
  "cbt-distortion-patterns": {
    id: "cbt-distortion-patterns",
    toolKey: "cbt",
    icon: "insights",
    titleKey: "home.widgets.cbtDistortionPatterns.title",
    descriptionKey: "home.widgets.cbtDistortionPatterns.metaDesc",
    tint: "primary",
    status: "available",
  },
  "cbt-distortion-guide": {
    id: "cbt-distortion-guide",
    toolKey: "cbt",
    icon: "menu-book",
    titleKey: "home.widgets.cbtDistortionGuide.title",
    descriptionKey: "home.widgets.cbtDistortionGuide.metaDesc",
    tint: "primary",
    status: "available",
  },
  "cbt-programme": {
    id: "cbt-programme",
    toolKey: "cbt",
    icon: "school",
    titleKey: "home.widgets.cbtProgramme.title",
    descriptionKey: "home.widgets.cbtProgramme.metaDesc",
    tint: "primary",
    status: "available",
  },
  "cbt-worry": {
    id: "cbt-worry",
    toolKey: "cbt",
    icon: "psychology",
    titleKey: "home.widgets.cbtWorry.title",
    descriptionKey: "home.widgets.cbtWorry.metaDesc",
    tint: "primary",
    status: "available",
  },
  "cbt-beliefs": {
    id: "cbt-beliefs",
    toolKey: "cbt",
    icon: "anchor",
    titleKey: "home.widgets.cbtBeliefs.title",
    descriptionKey: "home.widgets.cbtBeliefs.metaDesc",
    tint: "primary",
    status: "available",
  },
  "cbt-activities": {
    id: "cbt-activities",
    toolKey: "cbt",
    icon: "directions-run",
    titleKey: "home.widgets.cbtActivities.title",
    descriptionKey: "home.widgets.cbtActivities.metaDesc",
    tint: "primary",
    status: "available",
  },
  "cbt-exposure": {
    id: "cbt-exposure",
    toolKey: "cbt",
    icon: "layers",
    titleKey: "home.widgets.cbtExposure.title",
    descriptionKey: "home.widgets.cbtExposure.metaDesc",
    tint: "primary",
    status: "available",
  },
  "cbt-goals": {
    id: "cbt-goals",
    toolKey: "cbt",
    icon: "gps-fixed",
    titleKey: "home.widgets.cbtGoals.title",
    descriptionKey: "home.widgets.cbtGoals.metaDesc",
    tint: "primary",
    status: "available",
  },
  "act-committed-actions": {
    id: "act-committed-actions",
    toolKey: "act",
    icon: "checklist",
    titleKey: "home.widgets.actCommittedActions.title",
    descriptionKey: "home.widgets.actCommittedActions.metaDesc",
    tint: "act",
    status: "available",
  },
  "act-defusion": {
    id: "act-defusion",
    toolKey: "act",
    icon: "filter-drama",
    titleKey: "home.widgets.actDefusion.title",
    descriptionKey: "home.widgets.actDefusion.metaDesc",
    tint: "act",
    status: "available",
  },
  "act-programme": {
    id: "act-programme",
    toolKey: "act",
    icon: "route",
    titleKey: "home.widgets.actProgramme.title",
    descriptionKey: "home.widgets.actProgramme.metaDesc",
    tint: "act",
    status: "available",
  },
  "act-acceptance-prompt": {
    id: "act-acceptance-prompt",
    toolKey: "act",
    icon: "open-in-full",
    titleKey: "home.widgets.actAcceptancePrompt.title",
    descriptionKey: "home.widgets.actAcceptancePrompt.metaDesc",
    tint: "act",
    status: "available",
  },
  "journal-week": {
    id: "journal-week",
    toolKey: "journal",
    icon: "date-range",
    titleKey: "home.widgets.journalWeek.title",
    descriptionKey: "home.widgets.journalWeek.metaDesc",
    tint: "ink",
    status: "available",
  },
  "grounding-library": {
    id: "grounding-library",
    toolKey: "grounding",
    icon: "format-list-bulleted",
    titleKey: "home.widgets.groundingLibrary.title",
    descriptionKey: "home.widgets.groundingLibrary.metaDesc",
    tint: "clay",
    status: "available",
  },
  "grounding-log": {
    id: "grounding-log",
    toolKey: "grounding",
    icon: "history",
    titleKey: "home.widgets.groundingLog.title",
    descriptionKey: "home.widgets.groundingLog.metaDesc",
    tint: "clay",
    status: "available",
  },
  "gratitude-week": {
    id: "gratitude-week",
    toolKey: "gratitude",
    icon: "date-range",
    titleKey: "home.widgets.gratitudeWeek.title",
    descriptionKey: "home.widgets.gratitudeWeek.metaDesc",
    tint: "think",
    status: "available",
  },
  "gratitude-resurface": {
    id: "gratitude-resurface",
    toolKey: "gratitude",
    icon: "restore",
    titleKey: "home.widgets.gratitudeResurface.title",
    descriptionKey: "home.widgets.gratitudeResurface.metaDesc",
    tint: "think",
    status: "available",
  },
  "gratitude-prompt": {
    id: "gratitude-prompt",
    toolKey: "gratitude",
    icon: "favorite-border",
    titleKey: "home.widgets.gratitudePrompt.title",
    descriptionKey: "home.widgets.gratitudePrompt.metaDesc",
    tint: "think",
    status: "available",
  },
  "meditation-sit-time": {
    id: "meditation-sit-time",
    toolKey: "meditation",
    icon: "timer",
    titleKey: "home.widgets.meditationSitTime.title",
    descriptionKey: "home.widgets.meditationSitTime.metaDesc",
    tint: "iris",
    status: "available",
  },
  "meditation-continue": {
    id: "meditation-continue",
    toolKey: "meditation",
    icon: "play-arrow",
    titleKey: "home.widgets.meditationContinue.title",
    descriptionKey: "home.widgets.meditationContinue.metaDesc",
    tint: "iris",
    status: "available",
  },
  "sleep-notes": {
    id: "sleep-notes",
    toolKey: "sleep",
    icon: "edit-note",
    titleKey: "home.widgets.sleepNotes.title",
    descriptionKey: "home.widgets.sleepNotes.metaDesc",
    tint: "ink",
    status: "available",
  },
  "sleep-wind-down": {
    id: "sleep-wind-down",
    toolKey: "sleep",
    icon: "dark-mode",
    titleKey: "home.widgets.sleepWindDown.title",
    descriptionKey: "home.widgets.sleepWindDown.metaDesc",
    tint: "ink",
    status: "available",
  },
  "habits-quiet": {
    id: "habits-quiet",
    toolKey: "habits",
    icon: "schedule",
    titleKey: "home.widgets.habitsQuiet.title",
    descriptionKey: "home.widgets.habitsQuiet.metaDesc",
    tint: "act",
    status: "available",
  },
  "habits-one-deep": {
    id: "habits-one-deep",
    toolKey: "habits",
    icon: "center-focus-strong",
    titleKey: "home.widgets.habitsOneDeep.title",
    descriptionKey: "home.widgets.habitsOneDeep.metaDesc",
    tint: "act",
    status: "available",
  },
};

export function metaForWidget(widgetId: string): WidgetMeta | undefined {
  return WIDGET_META[widgetId];
}

export function isImplemented(widgetId: string): boolean {
  return widgetId in WIDGET_REGISTRY;
}

export function resolveWidget(widgetId: string, userId: string): React.ReactElement | null {
  const Component = WIDGET_REGISTRY[widgetId];
  if (!Component) return null;
  return <Component userId={userId} />;
}
