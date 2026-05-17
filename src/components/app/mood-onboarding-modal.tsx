import { Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

interface Props {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  onComplete: () => void;
  onDismiss?: () => void;
}

export function MoodOnboarding({
  visible,
  isPending = false,
  errorMessage,
  onComplete,
  onDismiss,
}: Props) {
  const { t } = useTranslation("mood");
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
            <View className="size-20 items-center justify-center rounded-2xl bg-be/15">
              <Icon name="mood" className="size-10 text-be" />
            </View>
            <Text variant="h2" className="text-center">
              {t("onboarding.welcome.title")}
            </Text>
            <Text variant="muted" className="text-center">
              {t("onboarding.welcome.subtitle")}
            </Text>
          </View>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="gap-2 pt-6">
              <Text className="font-semibold">{t("onboarding.affectLabel.title")}</Text>
              <Text variant="muted">{t("onboarding.affectLabel.body")}</Text>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="gap-2 pt-6">
              <Text className="font-semibold">{t("onboarding.patterns.title")}</Text>
              <Text variant="muted">{t("onboarding.patterns.body")}</Text>
            </CardContent>
          </Card>

          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <Icon name="tune" className="size-5 text-primary" />
              <Text className="text-base font-semibold">{t("onboarding.howToUse.title")}</Text>
            </View>
            <View className="gap-2">
              <InfoRow
                icon="looks-5"
                title={t("onboarding.howToUse.scaleLabel")}
                body={t("onboarding.howToUse.scaleBody")}
              />
              <InfoRow
                icon="label"
                title={t("onboarding.howToUse.emotionsLabel")}
                body={t("onboarding.howToUse.emotionsBody")}
              />
              <InfoRow
                icon="notes"
                title={t("onboarding.howToUse.notesLabel")}
                body={t("onboarding.howToUse.notesBody")}
              />
            </View>
          </View>

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
