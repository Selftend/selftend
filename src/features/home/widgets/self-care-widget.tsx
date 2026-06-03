import { useTranslation } from "react-i18next";

import { CbtShortcutWidget } from "@/src/features/home/widgets/cbt-shortcut-widget";

export function SelfCareWidget() {
  const { t } = useTranslation("navigation");
  return (
    <CbtShortcutWidget
      icon="spa"
      title={t("home.widgets.selfCare.title")}
      description={t("home.widgets.selfCare.desc")}
      cta={t("today.dashboard.logSelfCare")}
      route="/modules/cbt/self-care"
    />
  );
}
