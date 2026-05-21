import { useTranslation } from "react-i18next";

import { crisisActionUrls } from "@/src/features/policies/policy-content";
import { InfoScreen } from "@/src/features/policies/info-screen";

export default function CrisisScreen() {
  const { t } = useTranslation("policies");

  const actions = crisisActionUrls.map((action) => ({
    label: t(`crisis.actions.${action.key}`),
    url: action.url,
  }));

  return (
    <InfoScreen
      actions={actions}
      sectionKey="crisis.sections"
      subtitle={t("crisis.pageDescription")}
      title={t("crisis.pageTitle")}
    />
  );
}
