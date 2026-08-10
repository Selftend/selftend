import { ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { SettingsSectionCard } from "@/src/features/settings/components/settings-section-card";

interface OnboardingCardProps {
  disabled: boolean;
  isPending: boolean;
  onReplayIntroduction: () => void;
  onShowTipsAgain: () => void;
}

/**
 * Onboarding section. Presentational; the reset logic lives in
 * `useResetOnboarding` at the screen level so its feedback stays the single
 * shared banner (R7).
 */
export function OnboardingCard({
  disabled,
  isPending,
  onReplayIntroduction,
  onShowTipsAgain,
}: OnboardingCardProps) {
  const { t } = useTranslation("settings");

  return (
    <SettingsSectionCard
      icon="auto-stories"
      iconClassName="text-muted-foreground"
      badgeClassName="bg-muted"
      title={t("onboardingSection.title")}
      description={t("onboardingSection.description")}
    >
      <Button
        variant="outline"
        className="justify-start"
        disabled={disabled}
        onPress={onReplayIntroduction}
      >
        {isPending ? <ActivityIndicator /> : null}
        <Icon name="replay" size={18} />
        <Text className="flex-1">
          {isPending ? t("onboarding.saving") : t("onboardingSection.replayIntroduction")}
        </Text>
      </Button>
      <Button
        variant="outline"
        className="justify-start"
        disabled={disabled}
        onPress={onShowTipsAgain}
      >
        <Icon name="lightbulb" size={18} />
        <Text className="flex-1">{t("onboardingSection.showTipsAgain")}</Text>
      </Button>
    </SettingsSectionCard>
  );
}
