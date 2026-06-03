import { useTranslation } from "react-i18next";

import { CbtShortcutWidget } from "@/src/features/home/widgets/cbt-shortcut-widget";

export function CbtDistortionGuideWidget() {
  const { t } = useTranslation("navigation");
  return (
    <CbtShortcutWidget
      icon="menu-book"
      title={t("home.widgets.cbtDistortionGuide.title")}
      description={t("home.widgets.cbtDistortionGuide.metaDesc")}
      cta={t("home.widgets.cbtDistortionGuide.shortcutCta")}
      route="/modules/cbt/learn"
    />
  );
}
