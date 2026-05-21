import { useTranslation } from "react-i18next";

import { InfoScreen } from "@/src/features/policies/info-screen";

export default function AccountDeletionScreen() {
  const { t } = useTranslation("policies");

  return (
    <InfoScreen
      sectionKey="accountDeletion.sections"
      subtitle={t("accountDeletion.pageDescription")}
      title={t("accountDeletion.pageTitle")}
    />
  );
}
