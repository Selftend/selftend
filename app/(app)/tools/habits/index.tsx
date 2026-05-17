import { useTranslation } from "react-i18next";

import { ToolPlaceholderScreen } from "@/src/features/tools/tool-placeholder-screen";

export default function HabitsScreen() {
  const { t } = useTranslation("navigation");

  return (
    <ToolPlaceholderScreen
      title={t("today.tools.habits")}
      description={t("today.tools.habitsSub")}
    />
  );
}
