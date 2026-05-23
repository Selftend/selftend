import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { HelpSections } from "@/src/components/app/help-sections";
import {
  OnboardingHero,
  OnboardingInfoRow,
  RichOnboardingShell,
} from "@/src/components/app/rich-onboarding-shell";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

const sleepOnboardingImage = require("../../../assets/images/onboarding/sleep_recovery_one_eye.png");

interface Props {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  onComplete: () => void;
  onDismiss?: () => void;
}

export function SleepOnboarding({
  visible,
  isPending = false,
  errorMessage,
  onComplete,
  onDismiss,
}: Props) {
  const { t } = useTranslation("sleep");

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
        illustration={sleepOnboardingImage}
        title={t("onboarding.welcome.title")}
        subtitle={t("onboarding.welcome.subtitle")}
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="gap-2 pt-6">
          <Text className="font-semibold">{t("onboarding.why.title")}</Text>
          <Text variant="muted">{t("onboarding.why.body")}</Text>
        </CardContent>
      </Card>

      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Icon name="bedtime" className="size-5 text-be" />
          <Text className="text-base font-semibold">{t("onboarding.whatToLog.title")}</Text>
        </View>
        <View className="gap-2">
          <OnboardingInfoRow
            icon="schedule"
            title={t("onboarding.whatToLog.durationLabel")}
            body={t("onboarding.whatToLog.durationBody")}
          />
          <OnboardingInfoRow
            icon="star"
            title={t("onboarding.whatToLog.qualityLabel")}
            body={t("onboarding.whatToLog.qualityBody")}
          />
          <OnboardingInfoRow
            icon="notes"
            title={t("onboarding.whatToLog.notesLabel")}
            body={t("onboarding.whatToLog.notesBody")}
          />
        </View>
      </View>

      <HelpSections helpKey="sleep" />
    </RichOnboardingShell>
  );
}
