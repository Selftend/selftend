import { Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

type Step = "welcome" | "loop" | "identity" | "neverMiss";

const STEP_ORDER: Step[] = ["welcome", "loop", "identity", "neverMiss"];

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

  const [step, setStep] = useState<Step>("welcome");

  const stepIndex = STEP_ORDER.indexOf(step);

  function goNext() {
    if (stepIndex < STEP_ORDER.length - 1) setStep(STEP_ORDER[stepIndex + 1]);
  }
  function goBack() {
    if (stepIndex > 0) setStep(STEP_ORDER[stepIndex - 1]);
  }

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onDismiss ?? (() => undefined)}
      visible={visible}
    >
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-8 p-6 pb-12">
          {step === "welcome" ? (
            <View className="gap-6">
              <View className="items-center gap-3">
                <HeroIcon name="trending-up" tone="primary" />
                <Text variant="h2" className="text-center">
                  {t("onboarding.welcome.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.welcome.subtitle")}
                </Text>
              </View>
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
              <Button onPress={goNext}>
                <Text>{t("onboarding.welcome.continue")}</Text>
              </Button>
              {onDismiss ? (
                <Button onPress={onDismiss} variant="ghost">
                  <Text>{t("onboarding.skip")}</Text>
                </Button>
              ) : null}
            </View>
          ) : null}

          {step === "loop" ? (
            <View className="gap-6">
              <View className="items-center gap-3">
                <HeroIcon name="loop" tone="be" />
                <Text variant="h2" className="text-center">
                  {t("onboarding.loop.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.loop.subtitle")}
                </Text>
              </View>
              <LawCard
                icon="visibility"
                title={t("onboarding.loop.obviousTitle")}
                body={t("onboarding.loop.obviousBody")}
              />
              <LawCard
                icon="favorite-border"
                title={t("onboarding.loop.attractiveTitle")}
                body={t("onboarding.loop.attractiveBody")}
              />
              <LawCard
                icon="bolt"
                title={t("onboarding.loop.easyTitle")}
                body={t("onboarding.loop.easyBody")}
              />
              <LawCard
                icon="emoji-events"
                title={t("onboarding.loop.satisfyingTitle")}
                body={t("onboarding.loop.satisfyingBody")}
              />
              <Card className="border-muted">
                <CardContent className="gap-2 pt-6">
                  <Text variant="muted">{t("onboarding.loop.breakNote")}</Text>
                </CardContent>
              </Card>
              <View className="gap-3">
                <Button onPress={goNext}>
                  <Text>{t("onboarding.loop.continue")}</Text>
                </Button>
                <Button onPress={goBack} variant="ghost">
                  <Text>{t("onboarding.back")}</Text>
                </Button>
              </View>
            </View>
          ) : null}

          {step === "identity" ? (
            <View className="gap-6">
              <View className="items-center gap-3">
                <HeroIcon name="badge" tone="act" />
                <Text variant="h2" className="text-center">
                  {t("onboarding.identity.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.identity.subtitle")}
                </Text>
              </View>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="gap-2 pt-6">
                  <Text>{t("onboarding.identity.body")}</Text>
                </CardContent>
              </Card>
              <View className="gap-3">
                <Button onPress={goNext}>
                  <Text>{t("onboarding.identity.continue")}</Text>
                </Button>
                <Button onPress={goBack} variant="ghost">
                  <Text>{t("onboarding.back")}</Text>
                </Button>
              </View>
            </View>
          ) : null}

          {step === "neverMiss" ? (
            <View className="gap-6">
              <View className="items-center gap-3">
                <HeroIcon name="schedule" tone="primary" />
                <Text variant="h2" className="text-center">
                  {t("onboarding.neverMiss.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.neverMiss.subtitle")}
                </Text>
              </View>
              <Card className="border-border">
                <CardContent className="gap-2 pt-6">
                  <CardTitle>{t("onboarding.neverMiss.twoMinuteTitle")}</CardTitle>
                  <Text variant="muted">{t("onboarding.neverMiss.twoMinuteBody")}</Text>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="gap-2 pt-6">
                  <CardTitle>{t("onboarding.neverMiss.neverMissTitle")}</CardTitle>
                  <Text variant="muted">{t("onboarding.neverMiss.neverMissBody")}</Text>
                </CardContent>
              </Card>
              <View className="gap-3">
                <Button disabled={isPending} onPress={onComplete}>
                  <Text>
                    {isPending ? t("onboarding.finish.saving") : t("onboarding.finish.start")}
                  </Text>
                </Button>
                {errorMessage ? (
                  <Text className="text-sm text-destructive">{errorMessage}</Text>
                ) : null}
                <Button onPress={goBack} variant="ghost">
                  <Text>{t("onboarding.back")}</Text>
                </Button>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

interface HeroIconProps {
  name: MaterialIconName;
  tone: "primary" | "be" | "act";
}

function HeroIcon({ name, tone }: HeroIconProps) {
  const bg = {
    primary: "bg-primary/15",
    be: "bg-be/15",
    act: "bg-act/15",
  }[tone];
  const color = {
    primary: "text-primary",
    be: "text-be",
    act: "text-act",
  }[tone];

  return (
    <View className={`size-20 items-center justify-center rounded-3xl ${bg}`}>
      <Icon name={name} className={`size-10 ${color}`} />
    </View>
  );
}

interface LawCardProps {
  icon: MaterialIconName;
  title: string;
  body: string;
}

function LawCard({ icon, title, body }: LawCardProps) {
  return (
    <Card className="border-border">
      <CardContent className="flex-row items-start gap-3 pt-6">
        <View className="size-10 items-center justify-center rounded-xl bg-be/15">
          <Icon name={icon} className="size-5 text-be" />
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-semibold">{title}</Text>
          <Text variant="muted">{body}</Text>
        </View>
      </CardContent>
    </Card>
  );
}
