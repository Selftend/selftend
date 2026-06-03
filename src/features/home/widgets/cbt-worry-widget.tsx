import { useTranslation } from "react-i18next";

import { CbtShortcutWidget } from "@/src/features/home/widgets/cbt-shortcut-widget";

export function CbtWorryWidget() {
  const { t } = useTranslation("navigation");
  return (
    <CbtShortcutWidget
      icon="psychology"
      title={t("home.widgets.cbtWorry.title")}
      description={t("home.widgets.cbtWorry.metaDesc")}
      cta={t("home.widgets.cbtWorry.shortcutCta")}
      route="/modules/cbt/worry/new"
    />
  );
}
