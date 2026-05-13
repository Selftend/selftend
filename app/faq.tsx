import { useTranslation } from "react-i18next";

import { PolicyScreen } from "@/src/features/policies/policy-screen";

export default function FaqScreen() {
  const { t } = useTranslation("policies");

  return (
    <PolicyScreen
      sectionKey="faq.sections"
      subtitle={t("faq.pageDescription")}
      title={t("faq.pageTitle")}
    />
  );
}
