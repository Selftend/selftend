import { useTranslation } from "react-i18next";

import { PolicyScreen } from "@/src/features/policies/policy-screen";

export default function CookiesScreen() {
  const { t } = useTranslation("policies");

  return (
    <PolicyScreen
      sectionKey="cookies.sections"
      subtitle={t("cookies.pageDescription")}
      title={t("cookies.pageTitle")}
    />
  );
}
