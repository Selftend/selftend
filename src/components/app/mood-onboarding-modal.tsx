import { View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  OnboardingHero,
  OnboardingInfoRow,
  RichOnboardingShell,
} from "@/src/components/app/rich-onboarding-shell";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

const moodOnboardingImage = require("../../../assets/images/onboarding/mood_emotional_weather.png");

interface Props {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  onComplete: () => void;
  onDismiss: () => void;
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
      accessibilityLabel={t("onboarding.welcome.title")}
      ctaLabel={t("onboarding.finish.start")}
      onComplete={onComplete}
      onDismiss={onDismiss}
    >
      <OnboardingHero
        illustration={moodOnboardingImage}
        title={t("onboarding.welcome.title")}
        subtitle={t("onboarding.welcome.subtitle")}
      />

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

      {/* The second half of the tour describes the OVERVIEW, which is the part the
          redesign moved (#744). It replaces two prose cards that described a screen
          that no longer exists: an inline history list, and a fixed trailing week.

          Each row names a surface and says what it does. None of them reads the record
          back to the user - "what drains you, what lifts you" was the old copy promising
          an interpretation the product does not make. */}
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Icon name="insights" className="size-5 text-primary" />
          <Text className="text-base font-semibold">{t("onboarding.whatYouSee.title")}</Text>
        </View>
        <View className="gap-2">
          <OnboardingInfoRow
            icon="calendar-today"
            title={t("onboarding.whatYouSee.weekLabel")}
            body={t("onboarding.whatYouSee.weekBody")}
          />
          <OnboardingInfoRow
            icon="show-chart"
            title={t("onboarding.whatYouSee.chartsLabel")}
            body={t("onboarding.whatYouSee.chartsBody")}
          />
          <OnboardingInfoRow
            icon="history"
            title={t("onboarding.whatYouSee.historyLabel")}
            body={t("onboarding.whatYouSee.historyBody")}
          />
        </View>
      </View>
    </RichOnboardingShell>
  );
}
