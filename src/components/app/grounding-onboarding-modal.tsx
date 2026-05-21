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

const groundingOnboardingImage = require("../../../assets/images/onboarding/grounding_sweet_spot_frequency.png");

interface Props {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  onComplete: () => void;
  onDismiss?: () => void;
}

export function GroundingOnboarding({
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
      ctaLabel={t("grounding.onboarding.finish.start")}
      onComplete={onComplete}
      onDismiss={onDismiss}
    >
      <OnboardingHero
        illustration={groundingOnboardingImage}
        title={t("grounding.onboarding.welcome.title")}
        subtitle={t("grounding.onboarding.welcome.subtitle")}
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="gap-2 pt-6">
          <Text className="font-semibold">{t("grounding.onboarding.when.title")}</Text>
          <Text variant="muted">{t("grounding.onboarding.when.body")}</Text>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="gap-2 pt-6">
          <Text className="font-semibold">{t("grounding.onboarding.how.title")}</Text>
          <Text variant="muted">{t("grounding.onboarding.how.body")}</Text>
        </CardContent>
      </Card>

      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Icon name="anchor" className="size-5 text-be" />
          <Text className="text-base font-semibold">
            {t("grounding.onboarding.techniques.title")}
          </Text>
        </View>
        <View className="gap-2">
          <OnboardingInfoRow
            icon="filter-5"
            title={t("grounding.onboarding.techniques.senseLabel")}
            body={t("grounding.onboarding.techniques.senseBody")}
          />
          <OnboardingInfoRow
            icon="crop-square"
            title={t("grounding.onboarding.techniques.breathLabel")}
            body={t("grounding.onboarding.techniques.breathBody")}
          />
          <OnboardingInfoRow
            icon="water-drop"
            title={t("grounding.onboarding.techniques.coldLabel")}
            body={t("grounding.onboarding.techniques.coldBody")}
          />
          <OnboardingInfoRow
            icon="directions-walk"
            title={t("grounding.onboarding.techniques.feetLabel")}
            body={t("grounding.onboarding.techniques.feetBody")}
          />
        </View>
      </View>
    </RichOnboardingShell>
  );
}
