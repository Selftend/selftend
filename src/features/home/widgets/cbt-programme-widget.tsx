import { useTranslation } from "react-i18next";

import { CbtShortcutWidget } from "@/src/features/home/widgets/cbt-shortcut-widget";

export function CbtProgrammeWidget() {
  const { t } = useTranslation("navigation");
  return (
    <CbtShortcutWidget
      icon="school"
      title={t("home.widgets.cbtProgramme.title")}
      description={t("home.widgets.cbtProgramme.metaDesc")}
      cta={t("home.widgets.cbtProgramme.shortcutCta")}
      route="/modules/cbt"
    />
  );
}
