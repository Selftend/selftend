import { useTranslation } from "react-i18next";

import { LEGAL_REVIEW_PENDING } from "@/src/features/policies/policy-content";
import { InfoScreen } from "@/src/features/policies/info-screen";

export default function TermsScreen() {
  const { t } = useTranslation("policies");

  return (
    <InfoScreen
      notice={LEGAL_REVIEW_PENDING ? t("terms.reviewBanner") : undefined}
      sectionKey="terms.sections"
      showLastUpdated
      subtitle={t("terms.pageDescription")}
      title={t("terms.pageTitle")}
    />
  );
}
