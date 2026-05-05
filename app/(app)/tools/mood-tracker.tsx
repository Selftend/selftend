import { useTranslation } from "react-i18next";

import { ToolPlaceholderScreen } from "@/src/features/tools/tool-placeholder-screen";

export default function MoodTrackerScreen() {
  const { t } = useTranslation("settings");

  return (
    <ToolPlaceholderScreen
      title={t("tools.moodTracker")}
      description={t("tools.moodTrackerDescription")}
    />
  );
}
