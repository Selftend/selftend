import { useTranslation } from "react-i18next";

import { PolicyScreen } from "@/src/features/policies/policy-screen";
import { LEGAL_REVIEW_PENDING } from "@/src/features/policies/policy-content";

export default function PrivacyScreen() {
  const { t } = useTranslation("policies");

  return (
    <PolicyScreen
      notice={LEGAL_REVIEW_PENDING ? t("privacy.reviewBanner") : undefined}
      sectionKey="privacy.sections"
      subtitle={t("privacy.pageDescription")}
      title={t("privacy.pageTitle")}
    />
  );
}
