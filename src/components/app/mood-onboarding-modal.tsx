import { View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  OnboardingHero,
  OnboardingInfoRow,
  RichOnboardingShell,
} from "@/src/components/app/rich-onboarding-shell";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

const moodOnboardingImage = require("../../../assets/images/onboarding/mood-connection-badge.png");

interface Props {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  onComplete: () => void;
  onDismiss?: () => void;
}

export function MoodOnboarding({
  visible,
  isPending = false,
  errorMessage,
  onComplete,
  onDismiss,
}: Props) {
  const { t } = useTranslation("mood");

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
        illustration={moodOnboardingImage}
        title={t("onboarding.welcome.title")}
        subtitle={t("onboarding.welcome.subtitle")}
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="gap-2 pt-6">
          <Text className="font-semibold">{t("onboarding.affectLabel.title")}</Text>
          <Text variant="muted">{t("onboarding.affectLabel.body")}</Text>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="gap-2 pt-6">
          <Text className="font-semibold">{t("onboarding.patterns.title")}</Text>
          <Text variant="muted">{t("onboarding.patterns.body")}</Text>
        </CardContent>
      </Card>

      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Icon name="tune" className="size-5 text-primary" />
          <Text className="text-base font-semibold">{t("onboarding.howToUse.title")}</Text>
        </View>
        <View className="gap-2">
          <OnboardingInfoRow
            icon="looks-5"
            title={t("onboarding.howToUse.scaleLabel")}
            body={t("onboarding.howToUse.scaleBody")}
          />
          <OnboardingInfoRow
            icon="label"
            title={t("onboarding.howToUse.emotionsLabel")}
            body={t("onboarding.howToUse.emotionsBody")}
          />
          <OnboardingInfoRow
            icon="notes"
            title={t("onboarding.howToUse.notesLabel")}
            body={t("onboarding.howToUse.notesBody")}
          />
        </View>
      </View>
    </RichOnboardingShell>
  );
}
