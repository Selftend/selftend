import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";
import type { WidgetTint } from "@/src/features/home/widget-tint";

import { MoodCheckinWidget } from "@/src/features/home/widgets/mood-checkin-widget";
import { MoodTrendWidget } from "@/src/features/home/widgets/mood-trend-widget";
import { BreathingWidget } from "@/src/features/home/widgets/breathing-widget";
import { MeditationWidget } from "@/src/features/home/widgets/meditation-widget";
import { GratitudeWidget } from "@/src/features/home/widgets/gratitude-widget";
import { JournalWidget } from "@/src/features/home/widgets/journal-widget";
import { HabitsWidget } from "@/src/features/home/widgets/habits-widget";
import { SelfCareWidget } from "@/src/features/home/widgets/self-care-widget";
import { SleepLastNightWidget } from "@/src/features/home/widgets/sleep-last-night-widget";
import { Sleep7NightsWidget } from "@/src/features/home/widgets/sleep-7-nights-widget";
import { CbtOpenRecordWidget } from "@/src/features/home/widgets/cbt-open-record-widget";
import { ActValuesWidget } from "@/src/features/home/widgets/act-values-widget";
import { MindfulnessAnchorWidget } from "@/src/features/home/widgets/mindfulness-anchor-widget";
import { Grounding54321Widget } from "@/src/features/home/widgets/grounding-54321-widget";

export type WidgetComponent = React.ComponentType<{ userId: string }>;
export type WidgetStatus = "default" | "available" | "soon" | "composite";

export interface GridSpan {
  colSpan: number;
  rowSpan: number;
}

export interface WidgetMeta {
  id: string;
  toolKey: string;
  icon: MaterialIconName;
  titleKey: string;
  descriptionKey: string;
  tint: WidgetTint;
  status: WidgetStatus;
  span: GridSpan;
}

export const PINNED_WIDGET_ID = "mood-checkin";

export const WIDGET_REGISTRY: Record<string, WidgetComponent> = {
  "mood-checkin": MoodCheckinWidget,
  "mood-trend": MoodTrendWidget,
  "journal-latest": JournalWidget,
  "breathing-suggested": BreathingWidget,
  "gratitude-latest": GratitudeWidget,
  "meditation-pick": MeditationWidget,
  "habits-today": HabitsWidget,
  "self-care": SelfCareWidget,
  "cbt-open-record": CbtOpenRecordWidget,
  "act-values": ActValuesWidget,
  "mindfulness-anchor": MindfulnessAnchorWidget,
  "grounding-54321": Grounding54321Widget,
  "sleep-last-night": SleepLastNightWidget,
  "sleep-7-nights": Sleep7NightsWidget,
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
    span: { colSpan: 1, rowSpan: 1 },
  },
  "mood-trend": {
    id: "mood-trend",
    toolKey: "mood",
    icon: "show-chart",
    titleKey: "home.widgets.moodTrend.title",
    descriptionKey: "home.widgets.moodTrend.desc",
    tint: "be",
    status: "default",
    span: { colSpan: 1, rowSpan: 1 },
  },
  "journal-latest": {
    id: "journal-latest",
    toolKey: "journal",
    icon: "edit-note",
    titleKey: "home.widgets.journalLatest.title",
    descriptionKey: "home.widgets.journalLatest.desc",
    tint: "ink",
    status: "default",
    span: { colSpan: 1, rowSpan: 1 },
  },
  "breathing-suggested": {
    id: "breathing-suggested",
    toolKey: "breathing",
    icon: "air",
    titleKey: "home.widgets.breathingSuggested.title",
    descriptionKey: "home.widgets.breathingSuggested.desc",
    tint: "aqua",
    status: "default",
    span: { colSpan: 1, rowSpan: 1 },
  },
  "gratitude-latest": {
    id: "gratitude-latest",
    toolKey: "gratitude",
    icon: "favorite",
    titleKey: "home.widgets.gratitudeLatest.title",
    descriptionKey: "home.widgets.gratitudeLatest.desc",
    tint: "think",
    status: "default",
    span: { colSpan: 1, rowSpan: 1 },
  },
  "meditation-pick": {
    id: "meditation-pick",
    toolKey: "meditation",
    icon: "self-improvement",
    titleKey: "home.widgets.meditationPick.title",
    descriptionKey: "home.widgets.meditationPick.desc",
    tint: "iris",
    status: "default",
    span: { colSpan: 1, rowSpan: 1 },
  },
  "habits-today": {
    id: "habits-today",
    toolKey: "habits",
    icon: "task-alt",
    titleKey: "home.widgets.habitsToday.title",
    descriptionKey: "home.widgets.habitsToday.desc",
    tint: "act",
    status: "default",
    span: { colSpan: 1, rowSpan: 1 },
  },
  "self-care": {
    id: "self-care",
    toolKey: "cbt",
    icon: "spa",
    titleKey: "home.widgets.selfCare.title",
    descriptionKey: "home.widgets.selfCare.desc",
    tint: "primary",
    status: "available",
    span: { colSpan: 1, rowSpan: 1 },
  },
  "cbt-open-record": {
    id: "cbt-open-record",
    toolKey: "cbt",
    icon: "psychology",
    titleKey: "home.widgets.cbtOpenRecord.title",
    descriptionKey: "home.widgets.cbtOpenRecord.metaDesc",
    tint: "primary",
    status: "default",
    span: { colSpan: 1, rowSpan: 1 },
  },
  "act-values": {
    id: "act-values",
    toolKey: "act",
    icon: "explore",
    titleKey: "home.widgets.actValues.title",
    descriptionKey: "home.widgets.actValues.metaDesc",
    tint: "act",
    status: "default",
    span: { colSpan: 1, rowSpan: 1 },
  },
  "mindfulness-anchor": {
    id: "mindfulness-anchor",
    toolKey: "mindfulness",
    icon: "self-improvement",
    titleKey: "home.widgets.mindfulnessAnchor.title",
    descriptionKey: "home.widgets.mindfulnessAnchor.metaDesc",
    tint: "mist",
    status: "default",
    span: { colSpan: 1, rowSpan: 1 },
  },
  "grounding-54321": {
    id: "grounding-54321",
    toolKey: "grounding",
    icon: "anchor",
    titleKey: "home.widgets.grounding54321.title",
    descriptionKey: "home.widgets.grounding54321.metaDesc",
    tint: "clay",
    status: "default",
    span: { colSpan: 1, rowSpan: 1 },
  },
  "sleep-last-night": {
    id: "sleep-last-night",
    toolKey: "sleep",
    icon: "bedtime",
    titleKey: "home.widgets.sleepLastNight.title",
    descriptionKey: "home.widgets.sleepLastNight.metaDesc",
    tint: "ink",
    status: "default",
    span: { colSpan: 1, rowSpan: 1 },
  },
  "sleep-7-nights": {
    id: "sleep-7-nights",
    toolKey: "sleep",
    icon: "bar-chart",
    titleKey: "home.widgets.sleep7Nights.title",
    descriptionKey: "home.widgets.sleep7Nights.metaDesc",
    tint: "ink",
    status: "default",
    span: { colSpan: 1, rowSpan: 1 },
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

export function spanForWidget(widgetId: string): GridSpan {
  return WIDGET_META[widgetId]?.span ?? { colSpan: 1, rowSpan: 1 };
}

export function clampSpan(span: GridSpan, numColumns: number): GridSpan {
  return {
    colSpan: Math.min(span.colSpan, Math.max(1, numColumns)),
    rowSpan: span.rowSpan,
  };
}
