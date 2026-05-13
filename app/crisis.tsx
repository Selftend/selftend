import { useTranslation } from "react-i18next";

import { crisisActionUrls } from "@/src/features/policies/policy-content";
import { PolicyScreen } from "@/src/features/policies/policy-screen";

export default function CrisisScreen() {
  const { t } = useTranslation("policies");

  const actions = crisisActionUrls.map((action) => ({
    label: t(`crisis.actions.${action.key}`),
    url: action.url,
  }));

  return (
    <PolicyScreen
      actions={actions}
      sectionKey="crisis.sections"
      subtitle={t("crisis.pageDescription")}
      title={t("crisis.pageTitle")}
    />
  );
}
