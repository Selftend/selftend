import "expo-router/entry";

import { Platform } from "react-native";

if (Platform.OS === "android") {
  const {
    registerWidgetTaskHandler,
    registerWidgetConfigurationScreen,
  } = require("react-native-android-widget");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { widgetTaskHandler } = require("./src/features/widgets/widget-task-handler");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WidgetConfigurationScreen } = require("./src/features/widgets/widget-config-screen");
  registerWidgetTaskHandler(widgetTaskHandler);
  registerWidgetConfigurationScreen(WidgetConfigurationScreen);
}
