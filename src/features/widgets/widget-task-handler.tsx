import * as Linking from "expo-linking";
import { type WidgetTaskHandlerProps } from "react-native-android-widget";

import { readSnapshot } from "@/src/features/widgets/snapshot-store";
import { renderWidget } from "@/src/features/widgets/render-widget";
import { readConfig } from "@/src/features/widgets/widget-config-store";
import { OPEN_PATH } from "@/src/features/widgets/click-actions";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetName, widgetId, width, height } = props.widgetInfo;
  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const snapshot = await readSnapshot();
      const config = await readConfig(widgetId);
      const rendered = renderWidget({ widgetName, width, height, snapshot, config });
      props.renderWidget(rendered as Parameters<typeof props.renderWidget>[0]);
      break;
    }
    case "WIDGET_CLICK": {
      if (props.clickAction === OPEN_PATH) {
        const path =
          typeof props.clickActionData?.path === "string" ? props.clickActionData.path : null;
        if (path) await Linking.openURL(Linking.createURL(path));
      }
      break;
    }
    default:
      break;
  }
}
