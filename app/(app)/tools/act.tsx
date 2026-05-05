import { useTranslation } from "react-i18next";

import { ToolPlaceholderScreen } from "@/src/features/tools/tool-placeholder-screen";

export default function ActScreen() {
  const { t } = useTranslation("settings");

  return <ToolPlaceholderScreen title={t("tools.act")} description={t("tools.actDescription")} />;
}
