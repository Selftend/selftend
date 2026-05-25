import { router } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { useSaveCommittedAction } from "@/src/features/act/queries";
import { ACT_LIFE_DOMAINS, type ACTLifeDomain } from "@/src/features/act/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";

type Step = "domain" | "action" | "obstacles";
const STEP_ORDER: Step[] = ["domain", "action", "obstacles"];

export default function ActCommittedActionNewScreen() {
  const { t } = useTranslation(["act", "common"]);
  const { user } = useSession();
  const saveMutation = useSaveCommittedAction(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  const [step, setStep] = useState<Step>("domain");
  const [lifeDomain, setLifeDomain] = useState<ACTLifeDomain>("work");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [obstacles, setObstacles] = useState("");
  const [submitError, setSubmitError] = useState("");

  const stepIndex = STEP_ORDER.indexOf(step);
  const isLastStep = stepIndex === STEP_ORDER.length - 1;

  function goNext() {
    if (stepIndex < STEP_ORDER.length - 1) setStep(STEP_ORDER[stepIndex + 1]);
  }
  function goBack() {
    if (stepIndex > 0) setStep(STEP_ORDER[stepIndex - 1]);
  }

  async function handleSave() {
    if (!user) return;
    setSubmitError("");
    try {
      const saved = await saveMutation.mutateAsync({
        lifeDomain,
        title: title.trim(),
        description: description.trim(),
        targetDate: targetDate.trim() || null,
        obstacles: obstacles.trim(),
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace({
        pathname: "/modules/act/committed-action/[id]",
        params: { id: saved.id },
      } as Parameters<typeof router.replace>[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("act:committedAction.saveProblem");
      setSubmitError(message);
    }
  }

  const canGoNext = step === "domain" ? true : step === "action" ? title.trim().length > 0 : true;

  return (
    <MobileFormScreen
      footer={
        <View className="flex-row gap-3">
          {stepIndex > 0 ? (
            <View className="flex-1">
              <Button onPress={goBack} variant="ghost">
                <Text>{t("act:committedAction.back")}</Text>
              </Button>
            </View>
          ) : null}
          <View className="flex-1">
            <Button
              disabled={saveMutation.isPending || !canGoNext}
              onPress={() => void (isLastStep ? handleSave() : goNext())}
            >
              {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>
                {saveMutation.isPending
                  ? t("act:committedAction.saving")
                  : isLastStep
                    ? t("act:committedAction.saveLog")
                    : t("act:committedAction.continue")}
              </Text>
            </Button>
          </View>
        </View>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader title={t("act:committedAction.newTitle")} />
          <Text variant="muted">{t("act:committedAction.newSubtitle")}</Text>
        </View>

        {/* Step pills */}
        <View className="flex-row flex-wrap gap-2">
          {STEP_ORDER.map((s, index) => {
            const isActive = step === s;
            const isPast = index < stepIndex;
            return (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive, disabled: index > stepIndex }}
                disabled={index > stepIndex}
                onPress={() => {
                  if (index <= stepIndex) setStep(s);
                }}
                className={cn(
                  "rounded-full border px-3 py-1",
                  isActive
                    ? "border-act bg-act"
                    : isPast
                      ? "border-act/40 bg-act/10"
                      : "border-border bg-card opacity-40",
                )}
              >
                <Text
                  className={cn(
                    "text-xs font-semibold",
                    isActive ? "text-white" : isPast ? "text-act" : "text-muted-foreground",
                  )}
                >
                  {index + 1}. {t(`act:committedAction.steps.${s}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {submitError ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("act:committedAction.saveProblem")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text variant="muted">{submitError}</Text>
            </CardContent>
          </Card>
        ) : null}

        {/* Step 1: Domain */}
        {step === "domain" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:committedAction.domainLabel")}</Label>
            </View>
            <View className="gap-2">
              {ACT_LIFE_DOMAINS.map((domain) => {
                const selected = lifeDomain === domain;
                return (
                  <Pressable
                    key={domain}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setLifeDomain(domain)}
                    className={cn(
                      "rounded-xl border p-4 active:bg-accent/40",
                      selected ? "border-act bg-act/5" : "border-border bg-card",
                    )}
                  >
                    <Text className={cn("font-semibold", selected && "text-act")}>
                      {t(`act:values.${domain}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Step 2: Action details */}
        {step === "action" ? (
          <View className="gap-5">
            <View className="gap-3">
              <View className="gap-1">
                <Label>{t("act:committedAction.titleLabel")}</Label>
                <Text variant="muted" className="text-xs">
                  {t("act:committedAction.titleHint")}
                </Text>
              </View>
              <Textarea
                accessibilityLabel={t("act:committedAction.titleLabel")}
                onChangeText={setTitle}
                placeholder={t("act:committedAction.titlePlaceholder")}
                value={title}
                autoFocus
              />
            </View>
            <View className="gap-3">
              <Label>{t("act:committedAction.descriptionLabel")}</Label>
              <Textarea
                accessibilityLabel={t("act:committedAction.descriptionLabel")}
                onChangeText={setDescription}
                placeholder={t("act:committedAction.descriptionPlaceholder")}
                value={description}
              />
            </View>
            <View className="gap-3">
              <Label>{t("act:committedAction.targetDateLabel")}</Label>
              <Textarea
                accessibilityLabel={t("act:committedAction.targetDateLabel")}
                onChangeText={setTargetDate}
                placeholder={t("act:committedAction.targetDatePlaceholder")}
                value={targetDate}
                numberOfLines={1}
              />
            </View>
          </View>
        ) : null}

        {/* Step 3: Obstacles */}
        {step === "obstacles" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:committedAction.obstaclesLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:committedAction.obstaclesHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:committedAction.obstaclesLabel")}
              onChangeText={setObstacles}
              placeholder={t("act:committedAction.obstaclesPlaceholder")}
              value={obstacles}
              autoFocus
            />
          </View>
        ) : null}
      </View>
    </MobileFormScreen>
  );
}
