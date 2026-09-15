import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { LinkButton } from "@/src/components/app/link-button";
import { InfoScreen } from "@/src/features/policies/info-screen";
import { LEGAL_REVIEW_PENDING } from "@/src/features/policies/policy-content";
import { useRecordOrigin } from "@/src/lib/escape-origin";

export default function PrivacyScreen() {
  const { t } = useTranslation("policies");
  // A real anchor since #2467 (docs/brand-result.md § 7.4): this used to be a
  // `Button` with a press handler and no `href`, which is why `/security` was
  // an orphan to a crawler while looking linked to a mouse. The Origin is still
  // recorded on press - `Link asChild` calls this before it navigates - so the
  // Escape on `/security` keeps returning here.
  const recordOriginFor = useRecordOrigin();

  return (
    <InfoScreen
      notice={LEGAL_REVIEW_PENDING ? t("privacy.reviewBanner") : undefined}
      sectionKey="privacy.sections"
      showLastUpdated
      subtitle={t("privacy.pageDescription")}
      title={t("privacy.pageTitle")}
    >
      <LinkButton
        href="/security"
        variant="outline"
        className="justify-start"
        onPress={() => recordOriginFor("/security")}
      >
        <Icon name="shield" size={18} />
        <Text className="flex-1">{t("privacy.openSecurity")}</Text>
        <Icon name="chevron-right" size={18} className="text-muted-foreground" />
      </LinkButton>
    </InfoScreen>
  );
}
