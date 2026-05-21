import { useTranslation } from "react-i18next";

import { InfoScreen } from "@/src/features/policies/info-screen";
import { LEGAL_REVIEW_PENDING } from "@/src/features/policies/policy-content";

export default function PrivacyScreen() {
  const { t } = useTranslation("policies");

  return (
    <InfoScreen
      notice={LEGAL_REVIEW_PENDING ? t("privacy.reviewBanner") : undefined}
      sectionKey="privacy.sections"
      showLastUpdated
      subtitle={t("privacy.pageDescription")}
      title={t("privacy.pageTitle")}
    />
  );
}
