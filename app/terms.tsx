import { useTranslation } from "react-i18next";

import { LEGAL_REVIEW_PENDING } from "@/src/features/policies/policy-content";
import { PolicyScreen } from "@/src/features/policies/policy-screen";

export default function TermsScreen() {
  const { t } = useTranslation("policies");

  return (
    <PolicyScreen
      notice={LEGAL_REVIEW_PENDING ? t("terms.reviewBanner") : undefined}
      sectionKey="terms.sections"
      subtitle={t("terms.pageDescription")}
      title={t("terms.pageTitle")}
    />
  );
}
