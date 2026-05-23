import { useTranslation } from "react-i18next";

import { HelpSections } from "@/src/components/app/help-sections";
import { OnboardingHero, RichOnboardingShell } from "@/src/components/app/rich-onboarding-shell";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

const journalOnboardingImage = require("../../../assets/images/onboarding/journal_expressive_writing_heals.png");

interface Props {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  onComplete: () => void;
  onDismiss?: () => void;
}

export function JournalOnboarding({
  visible,
  isPending = false,
  errorMessage,
  onComplete,
  onDismiss,
}: Props) {
  const { t } = useTranslation("journal");

  return (
    <RichOnboardingShell
      visible={visible}
      isPending={isPending}
      errorMessage={errorMessage}
      ctaLabel={t("onboarding.finish.start")}
      onComplete={onComplete}
      onDismiss={onDismiss}
    >
      <OnboardingHero
        illustration={journalOnboardingImage}
        title={t("onboarding.welcome.title")}
        subtitle={t("onboarding.welcome.subtitle")}
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="gap-2 pt-6">
          <Text className="font-semibold">{t("onboarding.science.title")}</Text>
          <Text variant="muted">{t("onboarding.science.body")}</Text>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="gap-2 pt-6">
          <Text className="font-semibold">{t("onboarding.noPressure.title")}</Text>
          <Text variant="muted">{t("onboarding.noPressure.body")}</Text>
        </CardContent>
      </Card>

      <HelpSections helpKey="journal" />
    </RichOnboardingShell>
  );
}
