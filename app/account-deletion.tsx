import { useTranslation } from "react-i18next";

import { PolicyScreen } from "@/src/features/policies/policy-screen";

export default function AccountDeletionScreen() {
  const { t } = useTranslation("policies");

  return (
    <PolicyScreen
      sectionKey="accountDeletion.sections"
      subtitle={t("accountDeletion.pageDescription")}
      title={t("accountDeletion.pageTitle")}
    />
  );
}
