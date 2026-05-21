import { Image, Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

const meditationPath = require("../../../assets/images/onboarding/mind_illuminated_ten_stage_path.png");
const meditationCircles = require("../../../assets/images/onboarding/mind_illuminated_breath_focus.png");

interface MeditationInfoProps {
  visible: boolean;
  onComplete: () => void;
  onDismiss?: () => void;
}

export function MeditationInfo({ visible, onComplete, onDismiss }: MeditationInfoProps) {
  const { t } = useTranslation("meditation");
  const reduceMotionEnabled = useReduceMotionEnabled();

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onDismiss ?? (() => undefined)}
      visible={visible}
    >
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-8 p-6 pb-12">
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

          <View className="gap-4">
            <Button onPress={onDismiss ?? onComplete}>
              <Text>{t("info.dismiss")}</Text>
            </Button>
            <Text className="text-center text-xs text-muted-foreground">
              {t("info.attribution")}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
