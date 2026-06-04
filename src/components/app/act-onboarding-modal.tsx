import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { RichOnboardingShell } from "@/src/components/app/rich-onboarding-shell";

const actControlParadox = require("../../../assets/images/onboarding/act_control_paradox_thought_spiral.png");
const actFourMyths = require("../../../assets/images/onboarding/act_four_myths_trap.png");
const actValuesHeart = require("../../../assets/images/onboarding/act_values_rooted_heart.png");

// ─── Info modal (single page) ─────────────────────────────────────────────────

interface InfoProps {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  onComplete: () => void;
  onDismiss?: () => void;
}

export function ActInfo({
  visible,
  isPending = false,
  errorMessage,
  onComplete,
  onDismiss,
}: InfoProps) {
  const { t } = useTranslation("act");

  return (
    <RichOnboardingShell
      visible={visible}
      isPending={isPending}
      errorMessage={errorMessage}
      ctaLabel={isPending ? t("onboarding.commit.saving") : t("onboarding.info.gotIt")}
      ctaAlwaysCompletes
      onComplete={onComplete}
      onDismiss={onDismiss}
      footerSlot={
        <Text className="text-center text-xs text-muted-foreground">
          {t("onboarding.info.attribution")}
        </Text>
      }
    >
      <View className="items-center gap-3">
        <Text variant="h2" className="text-center">
          {t("onboarding.welcome.title")}
        </Text>
        <Text variant="muted" className="text-center">
          {t("onboarding.welcome.subtitle")}
        </Text>
      </View>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="items-center gap-3 pt-6">
          <Image
            source={actControlParadox}
            style={{ width: 180, height: 180 }}
            resizeMode="contain"
            accessibilityLabel={t("onboarding.welcome.controlParadox")}
          />
          <CardTitle className="text-center">{t("onboarding.welcome.controlParadox")}</CardTitle>
          <Text variant="muted" className="text-center">
            {t("onboarding.welcome.controlParadoxBody")}
          </Text>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="items-center gap-2 pt-6">
          <Image
            source={actFourMyths}
            style={{ width: 180, height: 180 }}
            resizeMode="contain"
            accessibilityLabel={t("onboarding.welcome.mythsTitle")}
          />
          <CardTitle className="mb-1 text-center">{t("onboarding.welcome.mythsTitle")}</CardTitle>
          {(["myth1", "myth2", "myth3", "myth4"] as const).map((key, i) => (
            <Text key={key} variant="muted">
              {`${i + 1}. ${t(`onboarding.welcome.${key}`)}`}
            </Text>
          ))}
        </CardContent>
      </Card>

      <Text variant="muted" className="text-center">
        {t("onboarding.welcome.body")}
      </Text>

      <Card className="border-act/30 bg-act/5">
        <CardContent className="gap-2 pt-6">
          <CardTitle className="text-center">{t("onboarding.choicePoint.title")}</CardTitle>
          <Text variant="muted" className="text-center">
            {t("onboarding.choicePoint.body")}
          </Text>
          <Text className="mt-1 text-sm font-semibold">{t("onboarding.choicePoint.toward")}</Text>
          <Text variant="muted" className="text-sm">
            {t("onboarding.choicePoint.away")}
          </Text>
        </CardContent>
      </Card>

      <Card className="border-act/30 bg-act/5">
        <CardContent className="items-center gap-2 pt-6">
          <Image
            source={actValuesHeart}
            style={{ width: 180, height: 180 }}
            resizeMode="contain"
            accessibilityLabel={t("onboarding.model.title")}
          />
          <CardTitle className="text-center">{t("onboarding.model.title")}</CardTitle>
          <Text variant="muted" className="text-center">
            {t("onboarding.model.subtitle")}
          </Text>
          <View className="mt-1 gap-2 self-stretch">
            {(["bePresent", "openUp", "doWhatMatters"] as const).map((pillar) => (
              <View key={pillar} className="gap-0.5">
                <Text className="font-semibold">{t(`program.phases.${pillar}.title`)}</Text>
                <Text variant="muted" className="text-sm">
                  {t(`program.phases.${pillar}.sub`)}
                </Text>
              </View>
            ))}
          </View>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="gap-1 pt-6">
          <Text className="text-center text-base font-semibold">
            {t("onboarding.model.formula")}
          </Text>
          <Text variant="muted" className="text-center text-sm">
            {t("onboarding.model.formulaBody")}
          </Text>
        </CardContent>
      </Card>
    </RichOnboardingShell>
  );
}
