import { Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { OnboardingIllustration } from "@/src/components/app/onboarding-illustration";
import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

const groundingOnboardingImage = require("../../../assets/images/onboarding/grounding-anchor-alt-badge.png");

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
            <OnboardingIllustration
              accessibilityLabel={t("grounding.onboarding.welcome.title")}
              source={groundingOnboardingImage}
            />
            <Text variant="h2" className="text-center">
              {t("grounding.onboarding.welcome.title")}
            </Text>
            <Text variant="muted" className="text-center">
              {t("grounding.onboarding.welcome.subtitle")}
            </Text>
          </View>

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
              <InfoRow
                icon="filter-5"
                title={t("grounding.onboarding.techniques.senseLabel")}
                body={t("grounding.onboarding.techniques.senseBody")}
              />
              <InfoRow
                icon="crop-square"
                title={t("grounding.onboarding.techniques.breathLabel")}
                body={t("grounding.onboarding.techniques.breathBody")}
              />
              <InfoRow
                icon="water-drop"
                title={t("grounding.onboarding.techniques.coldLabel")}
                body={t("grounding.onboarding.techniques.coldBody")}
              />
              <InfoRow
                icon="directions-walk"
                title={t("grounding.onboarding.techniques.feetLabel")}
                body={t("grounding.onboarding.techniques.feetBody")}
              />
            </View>
          </View>

          <View className="gap-3">
            <Button disabled={isPending} onPress={onDismiss ?? onComplete}>
              <Text>{t("grounding.onboarding.finish.start")}</Text>
            </Button>
            {errorMessage ? <Text className="text-sm text-destructive">{errorMessage}</Text> : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

interface InfoRowProps {
  icon: MaterialIconName;
  title: string;
  body: string;
}

function InfoRow({ icon, title, body }: InfoRowProps) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="mt-0.5 size-8 items-center justify-center rounded-lg bg-be/15">
        <Icon name={icon} className="size-4 text-be" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-semibold">{title}</Text>
        <Text variant="muted" className="text-sm">
          {body}
        </Text>
      </View>
    </View>
  );
}
