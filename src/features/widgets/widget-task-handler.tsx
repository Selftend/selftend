import * as Linking from "expo-linking";
import { type WidgetTaskHandlerProps } from "react-native-android-widget";

import { renderActivityWidget } from "@/src/features/widgets/activity-widget-view";
import { renderBreathingWidget } from "@/src/features/widgets/breathing-widget-view";
import { renderGroundingWidget } from "@/src/features/widgets/grounding-widget-view";
import { renderMindfulnessWidget } from "@/src/features/widgets/mindfulness-widget-view";
import { renderMoodCheckinWidget } from "@/src/features/widgets/mood-checkin-widget-view";

const RENDERERS: Record<string, () => unknown> = {
  MoodCheckin: renderMoodCheckinWidget,
  Breathing: renderBreathingWidget,
  Grounding: renderGroundingWidget,
  Mindfulness: renderMindfulnessWidget,
  Activity: renderActivityWidget,
};

function buildClickPath(
  action: string | undefined,
  data: Record<string, unknown> | undefined,
): string | null {
  if (action === "OPEN_MOOD") {
    const score = typeof data?.score === "number" ? data.score : null;
    return score ? `/tools/mood-tracker/new?score=${score}` : "/tools/mood-tracker/new";
  }
  if (action === "OPEN_BREATHING") {
    const slug = typeof data?.slug === "string" ? data.slug : null;
    return slug ? `/tools/breathing/${slug}` : "/tools/breathing";
  }
  if (action === "OPEN_GROUNDING") {
    const slug = typeof data?.slug === "string" ? data.slug : null;
    return slug ? `/tools/grounding/${slug}` : "/tools/grounding";
  }
  if (action === "OPEN_MINDFULNESS") {
    const slug = typeof data?.slug === "string" ? data.slug : null;
    return slug ? `/tools/mindfulness/${slug}` : "/tools/mindfulness";
  }
  if (action === "OPEN_ACTIVITY") {
    const domain = typeof data?.domain === "string" ? data.domain : null;
    return domain ? `/modules/cbt/activities/new?domain=${domain}` : "/modules/cbt/activities/new";
  }
  return null;
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const renderer = RENDERERS[props.widgetInfo.widgetName];
      if (renderer) {
        // The renderer returns a `WidgetRepresentation`, but the public type uses an internal
        // alias; cast through unknown to satisfy renderWidget without a deep-import.
        props.renderWidget(renderer() as Parameters<typeof props.renderWidget>[0]);
      }
      break;
    }
    case "WIDGET_CLICK": {
      const path = buildClickPath(props.clickAction, props.clickActionData);
      if (path) await Linking.openURL(Linking.createURL(path));
      break;
    }
    default:
      break;
  }
}
