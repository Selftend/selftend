import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { LoadingState } from "@/src/components/app/screen-state";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { NumberRating } from "@/src/components/app/number-rating";
import { distortionDefinitions } from "@/src/constants/distortions";
import { emotionOptions } from "@/src/constants/emotions";
import { useSaveThoughtRecord, useThoughtRecord } from "@/src/features/cbt/queries";
import { thoughtRecordFormSchema, type ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";
import { useSession } from "@/src/providers/session-provider";
import { useCbtDraftStore } from "@/src/stores/cbt-draft-store";
import { useToastStore } from "@/src/stores/toast-store";
import { BackButton } from "@/src/components/app/back-button";

const defaultValues: ThoughtRecordFormSchema = {
  situation: "",
  automaticThought: "",
  emotions: [],
  emotionIntensityBefore: null,
  distortions: [],
  evidenceFor: [],
  evidenceAgainst: [],
  balancedThought: "",
  emotionIntensityAfter: null,
  outcomeNotes: "",
};

function listToText(values: string[]) {
  return values.join("\n");
}

function textToList(value: string) {
  return value.split("\n");
}

function cleanList(values: string[]) {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

type ThoughtRecordStepKey =
  | "situation"
  | "automaticThought"
  | "emotions"
  | "evidence"
  | "distortions"
  | "balancedThought"
  | "outcome";

export default function ThoughtRecordEditorScreen() {
  const { t } = useTranslation("cbt");
  const { recordId: rawRecordId } = useLocalSearchParams<{ recordId?: string }>();
  const recordId = useMemo(
    () => (typeof rawRecordId === "string" && rawRecordId.length > 0 ? rawRecordId : null),
    [rawRecordId],
  );
  const draftMode = recordId ? "edit" : "create";
  const { user } = useSession();
  const [submitError, setSubmitError] = useState("");
  const stepIndex = useCbtDraftStore((state) => state.stepIndex);
  const storedDraftValues = useCbtDraftStore((state) =>
    state.mode === draftMode && state.recordId === recordId ? state.values : null,
  );
  const hydrateDraft = useCbtDraftStore((state) => state.hydrate);
  const nextStep = useCbtDraftStore((state) => state.nextStep);
  const previousStep = useCbtDraftStore((state) => state.previousStep);
  const resetDraft = useCbtDraftStore((state) => state.reset);
  const setDraftValues = useCbtDraftStore((state) => state.setValues);
  const showToast = useToastStore((state) => state.showToast);
  const { data: existingRecord, isLoading } = useThoughtRecord(user?.id ?? null, recordId);
  const saveMutation = useSaveThoughtRecord(user?.id ?? null);
  const {
    control,
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    reset,
    trigger,
  } = useForm<ThoughtRecordFormSchema>({
    defaultValues: storedDraftValues ?? defaultValues,
    resolver: zodResolver(thoughtRecordFormSchema),
  });

  useEffect(() => {
    hydrateDraft(draftMode, recordId);
  }, [draftMode, hydrateDraft, recordId]);

  useEffect(() => {
    if (!existingRecord || storedDraftValues) {
      return;
    }

    reset({
      automaticThought: existingRecord.automaticThought,
      balancedThought: existingRecord.balancedThought,
      distortions: existingRecord.distortions,
      emotionIntensityAfter: existingRecord.emotionIntensityAfter,
      emotionIntensityBefore: existingRecord.emotionIntensityBefore,
      emotions: existingRecord.emotions,
      evidenceAgainst: existingRecord.evidenceAgainst,
      evidenceFor: existingRecord.evidenceFor,
      outcomeNotes: existingRecord.outcomeNotes,
      situation: existingRecord.situation,
    });
  }, [existingRecord, reset, storedDraftValues]);

  const steps: {
    fields: (keyof ThoughtRecordFormSchema)[];
    key: ThoughtRecordStepKey;
    title: string;
  }[] = [
    {
      fields: ["situation"],
      key: "situation",
      title: t("record.situation"),
    },
    {
      fields: ["automaticThought"],
      key: "automaticThought",
      title: t("record.automaticThought"),
    },
    {
      fields: ["emotions", "emotionIntensityBefore"],
      key: "emotions",
      title: t("record.emotions"),
    },
    {
      fields: ["evidenceFor", "evidenceAgainst"],
      key: "evidence",
      title: t("record.evidence"),
    },
    {
      fields: ["distortions"],
      key: "distortions",
      title: t("record.patterns"),
    },
    {
      fields: ["balancedThought"],
      key: "balancedThought",
      title: t("record.balancedThought"),
    },
    {
      fields: ["emotionIntensityAfter", "outcomeNotes"],
      key: "outcome",
      title: t("record.outcome"),
    },
  ];

  const activeStepIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[activeStepIndex];
  const isLastStep = activeStepIndex === steps.length - 1;

  const handleNext = async () => {
    const isValid = await trigger(currentStep.fields);
    if (isValid) {
      nextStep(steps.length - 1);
    }
  };

  const handleSave = handleSubmit(async (values) => {
    setDraftValues(getValues());
    const input: ThoughtRecordFormSchema = {
      ...values,
      evidenceAgainst: cleanList(values.evidenceAgainst),
      evidenceFor: cleanList(values.evidenceFor),
      outcomeNotes: values.outcomeNotes.trim(),
    };

    try {
      setSubmitError("");
      const saved = await saveMutation.mutateAsync({
        input,
        recordId: recordId ?? undefined,
      });
      resetDraft();
      showToast({
        title: t("common:feedback.saved"),
        tone: "success",
      });
      router.replace(`/modules/cbt/history/${saved.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("detail.archiveError");
      setSubmitError(message);
      showToast({
        title: t("common:feedback.problem"),
        description: message,
        tone: "error",
      });
    }
  });

  if (recordId && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("detail.loading")} description={t("detail.loadingDescription")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <MobileFormScreen
      footer={
        <View className="flex-row gap-3">
          {stepIndex > 0 ? (
            <View className="flex-1">
              <Button onPress={previousStep} variant="ghost">
                <Text>{t("record.back")}</Text>
              </Button>
            </View>
          ) : null}
          <View className="flex-1">
            <Button
              disabled={isSubmitting || saveMutation.isPending}
              onPress={() => void (isLastStep ? handleSave() : handleNext())}
            >
              {isSubmitting || saveMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : null}
              <Text>
                {isSubmitting || saveMutation.isPending
                  ? t("record.saving")
                  : isLastStep
                    ? t("record.saveRecord")
                    : t("record.continue")}
              </Text>
            </Button>
          </View>
        </View>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <BackButton showLabel={false} className="-ml-2" />
            <Text variant="h1">{recordId ? t("record.editTitle") : t("record.newTitle")}</Text>
          </View>
          <Text variant="muted">
            {recordId ? t("record.editDescription") : t("record.newDescription")}
          </Text>
        </View>

        <CrisisSupportCallout />

        {submitError ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("record.saveProblem")}</CardTitle>
              <CardDescription>{submitError}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          {steps.map((step, index) => {
            const isActive = activeStepIndex === index;
            return (
              <Button
                accessibilityState={{
                  disabled: index > stepIndex,
                  selected: isActive,
                }}
                key={step.title}
                disabled={index > stepIndex}
                onPress={() => {
                  if (index <= stepIndex) {
                    useCbtDraftStore.getState().setStepIndex(index);
                  }
                }}
                size="sm"
                variant={isActive ? "secondary" : "ghost"}
              >
                <Text>
                  {index + 1}. {step.title}
                </Text>
              </Button>
            );
          })}
        </View>

        {currentStep.key === "situation" ? (
          <Controller
            control={control}
            name="situation"
            render={({ field: { onBlur, onChange, value } }) => (
              <View className="gap-2">
                <Label>{t("record.situation")}</Label>
                <Text variant="muted">{t("record.situationPlaceholder")}</Text>
                <Textarea
                  accessibilityHint={t("record.situationHint")}
                  accessibilityLabel={t("record.situation")}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder={t("record.situationExample")}
                  value={value}
                />
                {errors.situation?.message ? (
                  <Text variant="muted">{errors.situation.message}</Text>
                ) : null}
              </View>
            )}
          />
        ) : null}

        {currentStep.key === "automaticThought" ? (
          <Controller
            control={control}
            name="automaticThought"
            render={({ field: { onBlur, onChange, value } }) => (
              <View className="gap-2">
                <Label>{t("record.automaticThought")}</Label>
                <Text variant="muted">{t("record.automaticThoughtPlaceholder")}</Text>
                <Textarea
                  accessibilityHint={t("record.automaticThoughtHint")}
                  accessibilityLabel={t("record.automaticThought")}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder={t("record.automaticThoughtExample")}
                  value={value}
                />
                {errors.automaticThought?.message ? (
                  <Text variant="muted">{errors.automaticThought.message}</Text>
                ) : null}
              </View>
            )}
          />
        ) : null}

        {currentStep.key === "emotions" ? (
          <View className="gap-6">
            <Controller
              control={control}
              name="emotions"
              render={({ field: { onChange, value } }) => (
                <View className="gap-3">
                  <View className="gap-2">
                    <Label>{t("record.emotionsLabel")}</Label>
                    <Text variant="muted">{t("record.emotionsLabelHint")}</Text>
                  </View>
                  {emotionOptions.map((emotion) => {
                    const checked = value.includes(emotion);
                    const emotionKey = emotion.toLowerCase();
                    const label = t(`emotions.${emotionKey}`);
                    const toggle = () => {
                      const nextValues = checked
                        ? value.filter((item) => item !== emotion)
                        : [...value, emotion];
                      onChange(nextValues);
                    };
                    return (
                      <View key={emotion} className="flex-row items-center gap-3">
                        <Checkbox
                          accessibilityLabel={label}
                          checked={checked}
                          onCheckedChange={toggle}
                        />
                        <Label onPress={toggle}>{label}</Label>
                      </View>
                    );
                  })}
                  {errors.emotions?.message ? (
                    <Text variant="muted">{errors.emotions.message}</Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="emotionIntensityBefore"
              render={({ field: { onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("record.intensityBefore")}</Label>
                  <Text variant="muted">{t("record.intensityBeforeHint")}</Text>
                  <NumberRating min={0} max={100} step={10} value={value} onChange={onChange} />
                </View>
              )}
            />
          </View>
        ) : null}

        {currentStep.key === "evidence" ? (
          <View className="gap-6">
            <Controller
              control={control}
              name="evidenceFor"
              render={({ field: { onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("record.evidenceFor")}</Label>
                  <Text variant="muted">{t("record.evidenceForHint")}</Text>
                  <Textarea
                    accessibilityLabel={t("record.evidenceFor")}
                    onChangeText={(text) => onChange(textToList(text))}
                    placeholder={t("record.evidenceForPlaceholder")}
                    value={listToText(value)}
                  />
                </View>
              )}
            />

            <Controller
              control={control}
              name="evidenceAgainst"
              render={({ field: { onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("record.evidenceAgainst")}</Label>
                  <Text variant="muted">{t("record.evidenceAgainstHint")}</Text>
                  <Textarea
                    accessibilityLabel={t("record.evidenceAgainst")}
                    onChangeText={(text) => onChange(textToList(text))}
                    placeholder={t("record.evidenceAgainstPlaceholder")}
                    value={listToText(value)}
                  />
                </View>
              )}
            />
          </View>
        ) : null}

        {currentStep.key === "distortions" ? (
          <Controller
            control={control}
            name="distortions"
            render={({ field: { onChange, value } }) => (
              <View className="gap-3">
                <View className="gap-2">
                  <Label>{t("record.patternsLabel")}</Label>
                  <Text variant="muted">{t("record.patternsChooseHint")}</Text>
                </View>
                {distortionDefinitions.map((distortion) => {
                  const checked = value.includes(distortion.key);
                  const title = t(`distortions.${distortion.key}.title`);
                  const toggle = () => {
                    const nextValues = checked
                      ? value.filter((item) => item !== distortion.key)
                      : [...value, distortion.key];
                    onChange(nextValues);
                  };
                  return (
                    <Card key={distortion.key}>
                      <CardHeader>
                        <View className="flex-row items-center gap-3">
                          <Checkbox
                            accessibilityLabel={title}
                            checked={checked}
                            onCheckedChange={toggle}
                          />
                          <Label onPress={toggle}>{title}</Label>
                        </View>
                        <CardDescription>
                          {t(`distortions.${distortion.key}.shortDescription`)}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
                {errors.distortions?.message ? (
                  <Text variant="muted">{errors.distortions.message}</Text>
                ) : null}
              </View>
            )}
          />
        ) : null}

        {currentStep.key === "balancedThought" ? (
          <View className="gap-6">
            <Controller
              control={control}
              name="balancedThought"
              render={({ field: { onBlur, onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("record.balancedThoughtLabel")}</Label>
                  <Text variant="muted">{t("record.balancedThoughtPlaceholder")}</Text>
                  <Textarea
                    accessibilityHint={t("record.balancedThoughtHint")}
                    accessibilityLabel={t("record.balancedThoughtLabel")}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder={t("record.balancedThoughtExample")}
                    value={value}
                  />
                  {errors.balancedThought?.message ? (
                    <Text variant="muted">{errors.balancedThought.message}</Text>
                  ) : null}
                </View>
              )}
            />

            <Card>
              <CardHeader>
                <CardTitle>{t("record.summaryTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  <Text>
                    {t("record.summarySituation", {
                      value: getValues("situation") || t("record.summaryNotFilled"),
                    })}
                  </Text>
                  <Text>
                    {t("record.summaryThought", {
                      value: getValues("automaticThought") || t("record.summaryNotFilled"),
                    })}
                  </Text>
                  <Text>
                    {t("record.summaryEmotions", {
                      value: getValues("emotions").join(", ") || t("record.summaryNotFilled"),
                    })}
                  </Text>
                  <Text>
                    {t("record.summaryPatterns", {
                      value: getValues("distortions").join(", ") || t("record.summaryNotFilled"),
                    })}
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>
        ) : null}

        {currentStep.key === "outcome" ? (
          <View className="gap-6">
            <Controller
              control={control}
              name="emotionIntensityAfter"
              render={({ field: { onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("record.intensityAfter")}</Label>
                  <Text variant="muted">{t("record.intensityAfterHint")}</Text>
                  <NumberRating min={0} max={100} step={10} value={value} onChange={onChange} />
                </View>
              )}
            />

            <Controller
              control={control}
              name="outcomeNotes"
              render={({ field: { onBlur, onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("record.outcomeNotes")}</Label>
                  <Text variant="muted">{t("record.outcomeNotesHint")}</Text>
                  <Textarea
                    accessibilityLabel={t("record.outcomeNotes")}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder={t("record.outcomeNotesPlaceholder")}
                    value={value}
                  />
                </View>
              )}
            />
          </View>
        ) : null}
      </View>
    </MobileFormScreen>
  );
}
