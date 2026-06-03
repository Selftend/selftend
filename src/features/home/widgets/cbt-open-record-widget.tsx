import { useTranslation } from "react-i18next";

import { CbtShortcutWidget } from "@/src/features/home/widgets/cbt-shortcut-widget";

export function CbtOpenRecordWidget() {
  const { t } = useTranslation("navigation");
  return (
    <CbtShortcutWidget
      icon="psychology"
      title={t("home.widgets.cbtOpenRecord.title")}
      description={t("home.widgets.cbtOpenRecord.metaDesc")}
      cta={t("home.widgets.cbtOpenRecord.shortcutCta")}
      route="/modules/cbt/new"
    />
  );
}
