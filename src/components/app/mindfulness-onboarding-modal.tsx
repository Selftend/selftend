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

const mindfulnessOnboardingImage = require("../../../assets/images/onboarding/mindfulness_return_to_present.png");

interface Props {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  onComplete: () => void;
  onDismiss?: () => void;
}

export function MindfulnessOnboarding({
  visible,
  isPending = false,
  errorMessage,
  onComplete,
  onDismiss,
}: Props) {
  const { t } = useTranslation("cbt");

  return (
    <RichOnboardingShell
      visible={visible}
      isPending={isPending}
      errorMessage={errorMessage}
      ctaLabel={t("mindfulness.onboarding.finish.start")}
      onComplete={onComplete}
      onDismiss={onDismiss}
    >
      <OnboardingHero
        illustration={mindfulnessOnboardingImage}
        title={t("mindfulness.onboarding.welcome.title")}
        subtitle={t("mindfulness.onboarding.welcome.subtitle")}
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="gap-2 pt-6">
          <Text className="font-semibold">{t("mindfulness.onboarding.what.title")}</Text>
          <Text variant="muted">{t("mindfulness.onboarding.what.body")}</Text>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="gap-2 pt-6">
          <Text className="font-semibold">{t("mindfulness.onboarding.why.title")}</Text>
          <Text variant="muted">{t("mindfulness.onboarding.why.body")}</Text>
        </CardContent>
      </Card>

      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Icon name="self-improvement" className="size-5 text-be" />
          <Text className="text-base font-semibold">
            {t("mindfulness.onboarding.exercises.title")}
          </Text>
        </View>
        <View className="gap-2">
          <OnboardingInfoRow
            icon="air"
            title={t("mindfulness.onboarding.exercises.breathLabel")}
            body={t("mindfulness.onboarding.exercises.breathBody")}
          />
          <OnboardingInfoRow
            icon="accessibility"
            title={t("mindfulness.onboarding.exercises.bodyScanLabel")}
            body={t("mindfulness.onboarding.exercises.bodyScanBody")}
          />
          <OnboardingInfoRow
            icon="spa"
            title={t("mindfulness.onboarding.exercises.sittingLabel")}
            body={t("mindfulness.onboarding.exercises.sittingBody")}
          />
          <OnboardingInfoRow
            icon="restaurant"
            title={t("mindfulness.onboarding.exercises.eatingLabel")}
            body={t("mindfulness.onboarding.exercises.eatingBody")}
          />
        </View>
      </View>

      <HelpSections helpKey="mindfulness" />
    </RichOnboardingShell>
  );
}
