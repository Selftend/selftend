import { useTranslation } from "react-i18next";

import { CbtShortcutWidget } from "@/src/features/home/widgets/cbt-shortcut-widget";

export function CbtExposureWidget() {
  const { t } = useTranslation("navigation");
  return (
    <CbtShortcutWidget
      icon="layers"
      title={t("home.widgets.cbtExposure.title")}
      description={t("home.widgets.cbtExposure.metaDesc")}
      cta={t("home.widgets.cbtExposure.shortcutCta")}
      route="/modules/cbt/exposure/new"
    />
  );
}
