import "expo-router/entry";

import { Platform } from "react-native";

if (Platform.OS === "android") {
  /* eslint-disable @typescript-eslint/no-require-imports -- conditional Android-only
     native modules; cannot be top-level imports because they reference Android-specific
     native code unavailable on iOS/web and would crash on those platforms at import time */
  const {
    registerWidgetTaskHandler,
    registerWidgetConfigurationScreen,
  } = require("react-native-android-widget");
  const { widgetTaskHandler } = require("./src/features/widgets/widget-task-handler");
  const { WidgetConfigurationScreen } = require("./src/features/widgets/widget-config-screen");
  /* eslint-enable @typescript-eslint/no-require-imports */
  registerWidgetTaskHandler(widgetTaskHandler);
  registerWidgetConfigurationScreen(WidgetConfigurationScreen);
}
