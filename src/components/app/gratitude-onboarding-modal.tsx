import { Image, Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

const imgScience = require("../../../assets/images/onboarding/gratitude-science.png");
const imgLevels = require("../../../assets/images/onboarding/gratitude-levels.png");
const imgFrequency = require("../../../assets/images/onboarding/gratitude-frequency.png");

interface Props {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  onComplete: () => void;
  onDismiss?: () => void;
}

export function GratitudeOnboarding({
  visible,
  isPending = false,
  errorMessage,
  onComplete,
  onDismiss,
}: Props) {
  const { t } = useTranslation("gratitude");
  const reduceMotionEnabled = useReduceMotionEnabled();

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onDismiss ?? (() => undefined)}
      visible={visible}
    >
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-8 p-6 pb-12">
          {/* Welcome */}
          <View className="items-center gap-3">
            <Image
              source={imgScience}
              style={{ width: 200, height: 200 }}
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

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="gap-3 pt-6">
              <Text className="font-semibold">{t("onboarding.welcome.scienceTitle")}</Text>
              <Text variant="muted">{t("onboarding.welcome.scienceBody")}</Text>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="gap-3 pt-6">
              <Text className="font-semibold">{t("onboarding.welcome.antidoteTitle")}</Text>
              <Text variant="muted">{t("onboarding.welcome.antidoteBody")}</Text>
            </CardContent>
          </Card>

          {/* Levels */}
          <View className="items-center gap-3">
            <Image
              source={imgLevels}
              style={{ width: 200, height: 200 }}
              resizeMode="contain"
              accessibilityLabel={t("onboarding.levels.title")}
            />
            <Text variant="h2" className="text-center">
              {t("onboarding.levels.title")}
            </Text>
            <Text variant="muted" className="text-center">
              {t("onboarding.levels.subtitle")}
            </Text>
          </View>

          <Card className="border-border">
            <CardContent className="gap-2 pt-6">
              <CardTitle>{t("onboarding.levels.level1Title")}</CardTitle>
              <Text variant="muted">{t("onboarding.levels.level1Body")}</Text>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="gap-2 pt-6">
              <CardTitle>{t("onboarding.levels.level2Title")}</CardTitle>
              <Text variant="muted">{t("onboarding.levels.level2Body")}</Text>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="gap-2 pt-6">
              <CardTitle>{t("onboarding.levels.level3Title")}</CardTitle>
              <Text variant="muted">{t("onboarding.levels.level3Body")}</Text>
            </CardContent>
          </Card>

          {/* Frequency */}
          <View className="items-center gap-3">
            <Image
              source={imgFrequency}
              style={{ width: 240, height: 160 }}
              resizeMode="contain"
              accessibilityLabel={t("onboarding.frequency.title")}
            />
            <Text variant="h2" className="text-center">
              {t("onboarding.frequency.title")}
            </Text>
            <Text variant="muted" className="text-center">
              {t("onboarding.frequency.subtitle")}
            </Text>
          </View>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="gap-3 pt-6">
              <Text>{t("onboarding.frequency.body")}</Text>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="gap-2 pt-6">
              <Text variant="muted">{t("onboarding.frequency.note")}</Text>
            </CardContent>
          </Card>

          {/* CTA */}
          <View className="gap-3">
            <Button disabled={isPending} onPress={onDismiss ?? onComplete}>
              <Text>{t("onboarding.finish.start")}</Text>
            </Button>
            {errorMessage ? <Text className="text-sm text-destructive">{errorMessage}</Text> : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
