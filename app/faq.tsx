import { useTranslation } from "react-i18next";

import { InfoScreen } from "@/src/features/policies/info-screen";

export default function FaqScreen() {
  const { t } = useTranslation("policies");

  return (
    <InfoScreen
      sectionKey="faq.sections"
      subtitle={t("faq.pageDescription")}
      title={t("faq.pageTitle")}
    />
  );
}
