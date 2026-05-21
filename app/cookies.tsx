import { useTranslation } from "react-i18next";

import { InfoScreen } from "@/src/features/policies/info-screen";

export default function CookiesScreen() {
  const { t } = useTranslation("policies");

  return (
    <InfoScreen
      sectionKey="cookies.sections"
      showLastUpdated
      subtitle={t("cookies.pageDescription")}
      title={t("cookies.pageTitle")}
    />
  );
}
