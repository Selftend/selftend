import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { ScreenHeader } from "@/src/components/app/screen-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { NumberRating } from "@/src/components/app/number-rating";
import { LoadingState } from "@/src/components/app/screen-state";
import { useUpsertValueEntry, useValueEntryByDomain } from "@/src/features/act/queries";
import { ACT_LIFE_DOMAINS, type ACTLifeDomain } from "@/src/features/act/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";

type Step = "value" | "current" | "desired" | "barriers" | "ratings";
const STEP_ORDER: Step[] = ["value", "current", "desired", "barriers", "ratings"];

export default function ActValueDomainScreen() {
  const { t } = useTranslation(["act", "common"]);
  const { user } = useSession();
  const { domain: rawDomain } = useLocalSearchParams<{ domain: string }>();
  const domain = ACT_LIFE_DOMAINS.includes(rawDomain as ACTLifeDomain)
    ? (rawDomain as ACTLifeDomain)
    : null;

  const { data: existing, isLoading } = useValueEntryByDomain(user?.id ?? null, domain);
  const upsertMutation = useUpsertValueEntry(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  const [step, setStep] = useState<Step>("value");
  const [valueStatement, setValueStatement] = useState("");
  const [currentActionsNote, setCurrentActionsNote] = useState("");
  const [desiredActionsNote, setDesiredActionsNote] = useState("");
  const [barriers, setBarriers] = useState("");
  const [importanceRating, setImportanceRating] = useState<number | null>(null);
  const [alignmentRating, setAlignmentRating] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (existing && !prefilled) {
      setValueStatement(existing.valueStatement ?? "");
      setCurrentActionsNote(existing.currentActionsNote ?? "");
      setDesiredActionsNote(existing.desiredActionsNote ?? "");
      setBarriers(existing.barriers ?? "");
      setImportanceRating(existing.importanceRating ?? null);
      setAlignmentRating(existing.currentAlignmentRating ?? null);
      setPrefilled(true);
    }
  }, [existing, prefilled]);

  const stepIndex = STEP_ORDER.indexOf(step);
  const isLastStep = stepIndex === STEP_ORDER.length - 1;

  function goNext() {
    if (stepIndex < STEP_ORDER.length - 1) setStep(STEP_ORDER[stepIndex + 1]);
  }
  function goBack() {
    if (stepIndex > 0) setStep(STEP_ORDER[stepIndex - 1]);
  }

  async function handleSave() {
    if (!user || !domain) return;
    setSubmitError("");
    try {
      await upsertMutation.mutateAsync({
        lifeDomain: domain,
        valueStatement: valueStatement.trim(),
        currentActionsNote: currentActionsNote.trim(),
        desiredActionsNote: desiredActionsNote.trim(),
        barriers: barriers.trim(),
        importanceRating,
        currentAlignmentRating: alignmentRating,
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("act:values.saveProblem");
      setSubmitError(message);
    }
  }

  if (!domain) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text variant="muted">{t("act:values.saveProblem")}</Text>
      </SafeAreaView>
    );
  }

  if (isLoading && !prefilled) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <LoadingState title={t(`act:values.${domain}`)} />
      </SafeAreaView>
    );
  }

  return (
    <MobileFormScreen
      footer={
        <View className="flex-row gap-3">
          {stepIndex > 0 ? (
            <View className="flex-1">
              <Button onPress={goBack} variant="ghost">
                <Text>{t("act:values.back")}</Text>
              </Button>
            </View>
          ) : null}
          <View className="flex-1">
            <Button
              disabled={upsertMutation.isPending}
              onPress={() => void (isLastStep ? handleSave() : goNext())}
            >
              {upsertMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>
                {upsertMutation.isPending
                  ? t("act:values.saving")
                  : isLastStep
                    ? t("act:values.saveLog")
                    : t("act:values.continue")}
              </Text>
            </Button>
          </View>
        </View>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader title={t(`act:values.${domain}`)} />
          <Text variant="muted">{t("act:values.domainSubtitle")}</Text>
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
                  {index + 1}. {t(`act:values.steps.${s}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {submitError ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("act:values.saveProblem")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text variant="muted">{submitError}</Text>
            </CardContent>
          </Card>
        ) : null}

        {/* Step 1: Value statement */}
        {step === "value" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:values.valueStatementLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:values.valueStatementHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:values.valueStatementLabel")}
              onChangeText={setValueStatement}
              placeholder={t("act:values.valueStatementPlaceholder")}
              value={valueStatement}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 2: Current actions */}
        {step === "current" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:values.currentActionsLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:values.currentActionsHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:values.currentActionsLabel")}
              onChangeText={setCurrentActionsNote}
              placeholder={t("act:values.currentActionsPlaceholder")}
              value={currentActionsNote}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 3: Desired actions */}
        {step === "desired" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:values.desiredActionsLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:values.desiredActionsHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:values.desiredActionsLabel")}
              onChangeText={setDesiredActionsNote}
              placeholder={t("act:values.desiredActionsPlaceholder")}
              value={desiredActionsNote}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 4: Barriers */}
        {step === "barriers" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:values.barriersLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:values.barriersHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:values.barriersLabel")}
              onChangeText={setBarriers}
              placeholder={t("act:values.barriersPlaceholder")}
              value={barriers}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 5: Ratings */}
        {step === "ratings" ? (
          <View className="gap-6">
            <View className="gap-3">
              <View className="gap-1">
                <Label>{t("act:values.importanceRatingLabel")}</Label>
                <Text variant="muted" className="text-xs">
                  {t("act:values.importanceRatingHint")}
                </Text>
              </View>
              <NumberRating
                min={1}
                max={10}
                step={1}
                value={importanceRating}
                onChange={setImportanceRating}
              />
            </View>
            <View className="gap-3">
              <View className="gap-1">
                <Label>{t("act:values.alignmentRatingLabel")}</Label>
                <Text variant="muted" className="text-xs">
                  {t("act:values.alignmentRatingHint")}
                </Text>
              </View>
              <NumberRating
                min={1}
                max={10}
                step={1}
                value={alignmentRating}
                onChange={setAlignmentRating}
              />
            </View>
          </View>
        ) : null}
      </View>
    </MobileFormScreen>
  );
}
