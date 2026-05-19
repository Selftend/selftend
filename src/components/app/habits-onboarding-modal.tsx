import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";

import { OnboardingInfoRow, RichOnboardingShell } from "@/src/components/app/rich-onboarding-shell";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

const imgGrowth = require("../../../assets/images/onboarding/app-journey-growth-badge.png");
const imgTracker = require("../../../assets/images/onboarding/habits-tracker-garden-badge.png");

interface Props {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  onComplete: () => void;
  onDismiss?: () => void;
}

export function HabitsOnboarding({
  visible,
  isPending = false,
  errorMessage,
  onComplete,
  onDismiss,
}: Props) {
  const { t } = useTranslation("habits");

  return (
    <RichOnboardingShell
      visible={visible}
      isPending={isPending}
      errorMessage={errorMessage}
      ctaLabel={t("onboarding.finish.start")}
      onComplete={onComplete}
      onDismiss={onDismiss}
    >
      <View className="items-center gap-3">
        <Image
          source={imgGrowth}
          style={{ width: 260, height: 225 }}
          resizeMode="contain"
          accessibilityLabel={t("onboarding.welcome.title")}
        />
        <Text variant="h2" className="text-center">
          {t("onboarding.welcome.title")}
        </Text>
        <Text variant="muted" className="text-center">
          {t("onboarding.welcome.subtitle")}
        </Text>
      </View>

      <View className="gap-4">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="gap-2 pt-6">
            <Text className="font-semibold">{t("onboarding.welcome.compoundingTitle")}</Text>
            <Text variant="muted">{t("onboarding.welcome.compoundingBody")}</Text>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gap-2 pt-6">
            <Text className="font-semibold">{t("onboarding.welcome.systemsTitle")}</Text>
            <Text variant="muted">{t("onboarding.welcome.systemsBody")}</Text>
          </CardContent>
        </Card>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Icon name="loop" className="size-5 text-be" />
          <Text className="text-base font-semibold">{t("onboarding.loop.title")}</Text>
        </View>
        <Text variant="muted">{t("onboarding.loop.subtitle")}</Text>
        <View className="gap-2">
          <OnboardingInfoRow
            icon="visibility"
            title={t("onboarding.loop.obviousTitle")}
            body={t("onboarding.loop.obviousBody")}
          />
          <OnboardingInfoRow
            icon="favorite-border"
            title={t("onboarding.loop.attractiveTitle")}
            body={t("onboarding.loop.attractiveBody")}
          />
          <OnboardingInfoRow
            icon="bolt"
            title={t("onboarding.loop.easyTitle")}
            body={t("onboarding.loop.easyBody")}
          />
          <OnboardingInfoRow
            icon="emoji-events"
            title={t("onboarding.loop.satisfyingTitle")}
            body={t("onboarding.loop.satisfyingBody")}
          />
        </View>
        <Text variant="muted" className="text-xs">
          {t("onboarding.loop.breakNote")}
        </Text>
      </View>

      <Card className="border-act/30 bg-act/5">
        <CardContent className="items-center gap-3 pt-6">
          <View className="flex-row items-center gap-2 self-stretch">
            <Icon name="badge" className="size-5 text-act" />
            <CardTitle>{t("onboarding.identity.title")}</CardTitle>
          </View>
          <Text variant="muted" className="self-stretch">
            {t("onboarding.identity.body")}
          </Text>
        </CardContent>
      </Card>

      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Icon name="schedule" className="size-5 text-primary" />
          <Text className="text-base font-semibold">{t("onboarding.neverMiss.title")}</Text>
        </View>
        <Image
          source={imgTracker}
          style={{ width: 260, height: 225, alignSelf: "center" }}
          resizeMode="contain"
          accessibilityLabel={t("onboarding.neverMiss.title")}
        />
        <Card className="border-border">
          <CardContent className="gap-1.5 pt-6">
            <CardTitle>{t("onboarding.neverMiss.twoMinuteTitle")}</CardTitle>
            <Text variant="muted">{t("onboarding.neverMiss.twoMinuteBody")}</Text>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="gap-1.5 pt-6">
            <CardTitle>{t("onboarding.neverMiss.neverMissTitle")}</CardTitle>
            <Text variant="muted">{t("onboarding.neverMiss.neverMissBody")}</Text>
          </CardContent>
        </Card>
      </View>
    </RichOnboardingShell>
  );
}
