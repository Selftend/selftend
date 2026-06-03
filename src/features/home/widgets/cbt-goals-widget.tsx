import { useTranslation } from "react-i18next";

import { CbtShortcutWidget } from "@/src/features/home/widgets/cbt-shortcut-widget";

export function CbtGoalsWidget() {
  const { t } = useTranslation("navigation");
  return (
    <CbtShortcutWidget
      icon="gps-fixed"
      title={t("home.widgets.cbtGoals.title")}
      description={t("home.widgets.cbtGoals.metaDesc")}
      cta={t("home.widgets.cbtGoals.shortcutCta")}
      route="/modules/cbt/goals/new"
    />
  );
}
