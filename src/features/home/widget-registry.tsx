import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";

import { MoodWidget } from "@/src/features/home/widgets/mood-widget";
import { BreathingWidget } from "@/src/features/home/widgets/breathing-widget";
import { MeditationWidget } from "@/src/features/home/widgets/meditation-widget";
import { GratitudeWidget } from "@/src/features/home/widgets/gratitude-widget";
import { JournalWidget } from "@/src/features/home/widgets/journal-widget";
import { HabitsWidget } from "@/src/features/home/widgets/habits-widget";
import { SelfCareWidget } from "@/src/features/home/widgets/self-care-widget";
import { CbtModuleWidget } from "@/src/features/home/widgets/cbt-module-widget";
import { ActModuleWidget } from "@/src/features/home/widgets/act-module-widget";
import { GenericWidget } from "@/src/features/home/widgets/generic-widget";
import type { CarePlanItem } from "@/src/features/plan/types";

export type WidgetComponent = React.ComponentType<{ userId: string }>;

export interface WidgetMeta {
  icon: MaterialIconName;
  titleKey: string;
  descriptionKey: string;
}

export const WIDGET_REGISTRY: Record<string, WidgetComponent> = {
  mood: MoodWidget,
  breathing: BreathingWidget,
  meditation: MeditationWidget,
  gratitude: GratitudeWidget,
  journal: JournalWidget,
  habits: HabitsWidget,
  "self-care": SelfCareWidget,
  "module-cbt": CbtModuleWidget,
  "module-act": ActModuleWidget,
};

export const WIDGET_META: Record<string, WidgetMeta> = {
  mood: {
    icon: "mood",
    titleKey: "plan.wizard.toolMood",
    descriptionKey: "today.tools.moodTrackerSub",
  },
  breathing: {
    icon: "air",
    titleKey: "plan.wizard.toolBreathing",
    descriptionKey: "today.tools.mindfulnessSub",
  },
  meditation: {
    icon: "self-improvement",
    titleKey: "plan.wizard.toolMeditation",
    descriptionKey: "today.tools.meditationSub",
  },
  gratitude: {
    icon: "favorite",
    titleKey: "plan.wizard.toolGratitude",
    descriptionKey: "today.tools.gratitudeLogSub",
  },
  journal: {
    icon: "edit-note",
    titleKey: "plan.wizard.toolJournal",
    descriptionKey: "today.tools.journalSub",
  },
  habits: {
    icon: "directions-run",
    titleKey: "plan.wizard.toolHabits",
    descriptionKey: "today.tools.habitsSub",
  },
  "self-care": {
    icon: "spa",
    titleKey: "today.dashboard.selfCareTitle",
    descriptionKey: "today.dashboard.selfCareDesc",
  },
  "module-cbt": {
    icon: "psychology",
    titleKey: "today.modules.cbtName",
    descriptionKey: "today.dashboard.cbtModuleSubtitle",
  },
  "module-act": {
    icon: "explore",
    titleKey: "today.modules.actName",
    descriptionKey: "today.dashboard.actModuleSubtitle",
  },
};

export const WIDGET_TOOL_ORDER = [
  "module-cbt",
  "module-act",
  "mood",
  "breathing",
  "meditation",
  "gratitude",
  "journal",
  "habits",
  "self-care",
] as const;

export function normalizeWidgetToolId(toolId: string) {
  return toolId === "cbt" ? "module-cbt" : toolId;
}

export function visibleDashboardItems(items: CarePlanItem[]) {
  const hasCanonicalCbt = items.some((item) => item.toolId === "module-cbt");
  return items.filter((item) => !(hasCanonicalCbt && item.toolId === "cbt"));
}

export function existingWidgetToolIds(items: CarePlanItem[]) {
  return Array.from(new Set(items.map((item) => normalizeWidgetToolId(item.toolId))));
}

export function resolveWidget(item: CarePlanItem, userId: string): React.ReactElement {
  const Component = WIDGET_REGISTRY[normalizeWidgetToolId(item.toolId)];
  if (Component) {
    return <Component userId={userId} />;
  }
  return <GenericWidget userId={userId} item={item} />;
}
