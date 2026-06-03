import { useTranslation } from "react-i18next";

import { CbtShortcutWidget } from "@/src/features/home/widgets/cbt-shortcut-widget";

export function CbtBeliefsWidget() {
  const { t } = useTranslation("navigation");
  return (
    <CbtShortcutWidget
      icon="anchor"
      title={t("home.widgets.cbtBeliefs.title")}
      description={t("home.widgets.cbtBeliefs.metaDesc")}
      cta={t("home.widgets.cbtBeliefs.shortcutCta")}
      route="/modules/cbt/beliefs/new"
    />
  );
}
