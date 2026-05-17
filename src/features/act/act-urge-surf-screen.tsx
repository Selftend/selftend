import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { BackButton } from "@/src/components/app/back-button";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { NumberRating } from "@/src/components/app/number-rating";
import { useUrgeSurfLogs, useSaveUrgeSurfLog } from "@/src/features/act/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";

type Step = "urge" | "trigger" | "observe" | "complete";
const STEP_ORDER: Step[] = ["urge", "trigger", "observe", "complete"];

function UrgeSurfHistoryItem({ urge, date }: { urge: string; date: string }) {
  return (
    <View className="rounded-lg border border-border bg-card p-3">
      <Text className="font-medium" numberOfLines={2}>
        {urge}
      </Text>
      <Text variant="muted" className="mt-1 text-xs">
        {new Date(date).toLocaleString()}
      </Text>
    </View>
  );
}

export default function ActUrgeSurfScreen() {
  const { t } = useTranslation(["act", "common"]);
  const { user } = useSession();
  const saveMutation = useSaveUrgeSurfLog(user?.id ?? null);
  const { data: logs } = useUrgeSurfLogs(user?.id ?? null, 5);
  const showToast = useToastStore((state) => state.showToast);

  const [mode, setMode] = useState<"list" | "form">("list");
  const [step, setStep] = useState<Step>("urge");
  const [urgeDescription, setUrgeDescription] = useState("");
  const [trigger, setTrigger] = useState("");
  const [peakIntensity, setPeakIntensity] = useState<number | null>(null);
  const [urgeActedOn, setUrgeActedOn] = useState<boolean>(false);
  const [surfingNotes, setSurfingNotes] = useState("");
  const [submitError, setSubmitError] = useState("");

  const stepIndex = STEP_ORDER.indexOf(step);
  const isLastStep = stepIndex === STEP_ORDER.length - 1;

  function startNew() {
    setStep("urge");
    setUrgeDescription("");
    setTrigger("");
    setPeakIntensity(null);
    setUrgeActedOn(false);
    setSurfingNotes("");
    setSubmitError("");
    setMode("form");
  }

  function goNext() {
    if (stepIndex < STEP_ORDER.length - 1) setStep(STEP_ORDER[stepIndex + 1]);
  }
  function goBack() {
    if (stepIndex > 0) {
      setStep(STEP_ORDER[stepIndex - 1]);
    } else {
      setMode("list");
    }
  }

  async function handleSave() {
    if (!user) return;
    setSubmitError("");
    try {
      await saveMutation.mutateAsync({
        urgeDescription: urgeDescription.trim(),
        trigger: trigger.trim(),
        peakIntensity,
        urgeActedOn,
        surfingNotes: surfingNotes.trim(),
        completedAt: new Date().toISOString(),
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      setMode("list");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("act:expansion.urgeSurf.saveProblem");
      setSubmitError(message);
    }
  }

  if (mode === "list") {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <BackButton showLabel={false} className="-ml-2" />
                <Text variant="h1">{t("act:expansion.urgeSurfTitle")}</Text>
              </View>
              <Text variant="muted">{t("act:expansion.urgeSurfSubtitle")}</Text>
            </View>

            <Button onPress={startNew}>
              <Text>{t("act:expansion.urgeSurfTitle")}</Text>
            </Button>

            {!logs || logs.length === 0 ? (
              <Text variant="muted">{t("act:expansion.noUrgeLogs")}</Text>
            ) : (
              <View className="gap-2">
                <Text variant="muted" className="text-xs uppercase tracking-wider">
                  {t("act:expansion.urgeSurfingTitle")}
                </Text>
                {logs.map((log) => (
                  <UrgeSurfHistoryItem
                    key={log.id}
                    urge={log.urgeDescription}
                    date={log.createdAt}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <MobileFormScreen
      footer={
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button onPress={goBack} variant="ghost">
              <Text>{t("act:expansion.back")}</Text>
            </Button>
          </View>
          <View className="flex-1">
            <Button
              disabled={
                saveMutation.isPending || (step === "urge" && urgeDescription.trim().length === 0)
              }
              onPress={() => void (isLastStep ? handleSave() : goNext())}
            >
              {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>
                {saveMutation.isPending
                  ? t("act:expansion.urgeSurf.saving")
                  : isLastStep
                    ? t("act:expansion.urgeSurf.saveLog")
                    : t("act:expansion.continue")}
              </Text>
            </Button>
          </View>
        </View>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <Text variant="h1">{t("act:expansion.urgeSurfTitle")}</Text>
          </View>
          <Text variant="muted">{t("act:expansion.urgeSurfSubtitle")}</Text>
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
                  {index + 1}. {t(`act:expansion.urgeSurf.steps.${s}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {submitError ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("act:expansion.urgeSurf.saveProblem")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text variant="muted">{submitError}</Text>
            </CardContent>
          </Card>
        ) : null}

        {/* Step 1: Urge */}
        {step === "urge" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:expansion.urgeSurf.urgeLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:expansion.urgeSurf.urgeHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:expansion.urgeSurf.urgeLabel")}
              onChangeText={setUrgeDescription}
              placeholder={t("act:expansion.urgeSurf.urgePlaceholder")}
              value={urgeDescription}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 2: Trigger */}
        {step === "trigger" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:expansion.urgeSurf.triggerLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:expansion.urgeSurf.triggerHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:expansion.urgeSurf.triggerLabel")}
              onChangeText={setTrigger}
              placeholder={t("act:expansion.urgeSurf.triggerPlaceholder")}
              value={trigger}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 3: Observe (surfing guidance) */}
        {step === "observe" ? (
          <View className="gap-4">
            <Card className="border-act/30 bg-act/5">
              <CardHeader>
                <CardTitle className="text-act">
                  {t("act:expansion.urgeSurf.observeTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-sm leading-relaxed text-muted-foreground">
                  {t("act:expansion.urgeSurf.observeBody")}
                </Text>
              </CardContent>
            </Card>
            <View className="gap-3">
              <View className="gap-1">
                <Label>{t("act:expansion.urgeSurf.peakLabel")}</Label>
                <Text variant="muted" className="text-xs">
                  {t("act:expansion.urgeSurf.peakHint")}
                </Text>
              </View>
              <NumberRating
                min={0}
                max={100}
                step={10}
                value={peakIntensity}
                onChange={setPeakIntensity}
              />
            </View>
          </View>
        ) : null}

        {/* Step 4: Complete */}
        {step === "complete" ? (
          <View className="gap-6">
            <View className="gap-3">
              <Label>{t("act:expansion.urgeSurf.actedOnLabel")}</Label>
              <View className="flex-row gap-3">
                {([true, false] as const).map((val) => {
                  const selected = urgeActedOn === val;
                  return (
                    <Pressable
                      key={String(val)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setUrgeActedOn(val)}
                      className={cn(
                        "flex-1 rounded-xl border p-4 active:bg-accent/40",
                        selected ? "border-act bg-act/5" : "border-border bg-card",
                      )}
                    >
                      <Text className={cn("text-center font-semibold", selected && "text-act")}>
                        {val
                          ? t("act:expansion.urgeSurf.actedOnYes")
                          : t("act:expansion.urgeSurf.actedOnNo")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="gap-3">
              <Label>{t("act:expansion.urgeSurf.notesLabel")}</Label>
              <Textarea
                accessibilityLabel={t("act:expansion.urgeSurf.notesLabel")}
                onChangeText={setSurfingNotes}
                placeholder={t("act:expansion.urgeSurf.notesPlaceholder")}
                value={surfingNotes}
              />
            </View>
          </View>
        ) : null}
      </View>
    </MobileFormScreen>
  );
}
