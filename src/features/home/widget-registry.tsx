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
