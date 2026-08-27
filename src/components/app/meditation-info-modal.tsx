import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";
import { RichOnboardingShell } from "@/src/components/app/rich-onboarding-shell";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

const meditationPath = require("../../../assets/images/onboarding/mind_illuminated_ten_stage_path.png");
const meditationCircles = require("../../../assets/images/onboarding/mind_illuminated_breath_focus.png");

interface MeditationInfoProps {
  visible: boolean;
  onComplete: () => void;
  onDismiss: () => void;
}

/**
 * The meditation Guide. Renders through `RichOnboardingShell` like every
 * other Guide (W21/#1259): this used to be a hand-rolled clone of the shell,
 * which is exactly how it ended up missing the dialog's accessible name and
 * the keyboard avoidance the shell provides. The shell's default CTA fires
 * `onDismiss` — same as this Guide's bottom button always did.
 */
export function MeditationInfo({ visible, onComplete, onDismiss }: MeditationInfoProps) {
  const { t } = useTranslation("meditation");

  return (
    <RichOnboardingShell
      visible={visible}
      accessibilityLabel={t("info.title")}
      ctaLabel={t("info.dismiss")}
      onComplete={onComplete}
      onDismiss={onDismiss}
    >
      <View className="items-center gap-3">
        <Text variant="h2" className="text-center">
          {t("info.title")}
        </Text>
        <Text variant="muted" className="text-center">
          {t("info.subtitle")}
        </Text>
      </View>

      <Card>
        <CardContent className="items-center gap-4 pt-6">
          <Image
            source={meditationPath}
            style={{ width: 240, height: 210 }}
            resizeMode="contain"
            accessibilityLabel={t("info.heroAlt")}
          />
          <Text variant="muted" className="text-center">
            {t("info.heroBody")}
          </Text>
        </CardContent>
      </Card>

      <View className="gap-4">
        <Text variant="h3" className="text-center">
          {t("info.conceptsTitle")}
        </Text>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="items-center gap-4 pt-6">
            <Image
              source={meditationCircles}
              style={{ width: 220, height: 190 }}
              resizeMode="contain"
              accessibilityLabel={t("info.circlesAlt")}
            />
            <View className="w-full gap-3">
              <View className="gap-1">
                <Text className="font-semibold">{t("info.attentionTitle")}</Text>
                <Text variant="muted">{t("info.attentionBody")}</Text>
              </View>
              <View className="gap-1">
                <Text className="font-semibold">{t("info.awarenessTitle")}</Text>
                <Text variant="muted">{t("info.awarenessBody")}</Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>

      <Card>
        <CardContent className="gap-3 pt-6">
          <CardTitle>{t("info.principlesTitle")}</CardTitle>
          <Text variant="muted">
            {"• "}
            {t("info.patience")}
          </Text>
          <Text variant="muted">
            {"• "}
            {t("info.intention")}
          </Text>
          <Text variant="muted">
            {"• "}
            {t("info.everySit")}
          </Text>
        </CardContent>
      </Card>
    </RichOnboardingShell>
  );
}
