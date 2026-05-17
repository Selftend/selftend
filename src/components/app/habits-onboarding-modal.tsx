import { Image, Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

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
              <LawRow
                icon="visibility"
                title={t("onboarding.loop.obviousTitle")}
                body={t("onboarding.loop.obviousBody")}
              />
              <LawRow
                icon="favorite-border"
                title={t("onboarding.loop.attractiveTitle")}
                body={t("onboarding.loop.attractiveBody")}
              />
              <LawRow
                icon="bolt"
                title={t("onboarding.loop.easyTitle")}
                body={t("onboarding.loop.easyBody")}
              />
              <LawRow
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

interface LawRowProps {
  icon: MaterialIconName;
  title: string;
  body: string;
}

function LawRow({ icon, title, body }: LawRowProps) {
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
