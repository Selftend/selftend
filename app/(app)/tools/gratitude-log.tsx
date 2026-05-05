import { useTranslation } from "react-i18next";

import { ToolPlaceholderScreen } from "@/src/features/tools/tool-placeholder-screen";

export default function GratitudeLogScreen() {
  const { t } = useTranslation("settings");

  return (
    <ToolPlaceholderScreen
      title={t("tools.gratitudeLog")}
      description={t("tools.gratitudeLogDescription")}
    />
  );
}
