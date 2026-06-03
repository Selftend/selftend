import { useTranslation } from "react-i18next";

import { CbtShortcutWidget } from "@/src/features/home/widgets/cbt-shortcut-widget";

export function CbtActivitiesWidget() {
  const { t } = useTranslation("navigation");
  return (
    <CbtShortcutWidget
      icon="directions-run"
      title={t("home.widgets.cbtActivities.title")}
      description={t("home.widgets.cbtActivities.metaDesc")}
      cta={t("home.widgets.cbtActivities.shortcutCta")}
      route="/modules/cbt/activities/new"
    />
  );
}
