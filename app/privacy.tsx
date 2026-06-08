import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
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
    >
      <Button variant="outline" className="justify-start" onPress={() => router.push("/security")}>
        <Icon name="shield" size={18} />
        <Text className="flex-1">{t("privacy.openSecurity")}</Text>
        <Icon name="chevron-right" size={18} className="text-muted-foreground" />
      </Button>
    </InfoScreen>
  );
}
