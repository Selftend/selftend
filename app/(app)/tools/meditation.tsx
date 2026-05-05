import { useTranslation } from "react-i18next";

import { ToolPlaceholderScreen } from "@/src/features/tools/tool-placeholder-screen";

export default function MeditationScreen() {
  const { t } = useTranslation("settings");

  return (
    <ToolPlaceholderScreen
      title={t("tools.meditation")}
      description={t("tools.meditationDescription")}
    />
  );
}
