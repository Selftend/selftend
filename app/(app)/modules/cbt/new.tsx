import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
import { NumberRating } from "@/src/components/app/number-rating";
import { WizardScreen } from "@/src/components/app/wizard-screen";
import { distortionDefinitions } from "@/src/constants/distortions";
import { emotionOptions } from "@/src/constants/emotions";
import { useSaveThoughtRecord, useThoughtRecord } from "@/src/features/cbt/queries";
import { thoughtRecordFormSchema, type ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";
import { useWizardDraft, selectWizardDraftValues } from "@/src/lib/use-wizard-draft";
import { useSession } from "@/src/providers/session-provider";
import { useCbtDraftStore } from "@/src/stores/cbt-draft-store";

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
  const recordId = typeof rawRecordId === "string" && rawRecordId.length > 0 ? rawRecordId : null;
  const draftMode = recordId ? "edit" : "create";
  const { user } = useSession();
  const [submitError, setSubmitError] = useState("");

  const storedDraftValues = useCbtDraftStore(
    selectWizardDraftValues<ThoughtRecordFormSchema>(draftMode, recordId),
  );

  const { data: existingRecord, isLoading } = useThoughtRecord(user?.id ?? null, recordId);
  const saveMutation = useSaveThoughtRecord(user?.id ?? null);

  const form = useForm<ThoughtRecordFormSchema>({
    defaultValues: storedDraftValues ?? defaultValues,
    resolver: zodResolver(thoughtRecordFormSchema),
  });
  const {
    control,
    formState: { errors },
    getValues,
    reset,
  } = form;

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
    { fields: ["situation"], key: "situation", title: t("record.situation") },
    { fields: ["automaticThought"], key: "automaticThought", title: t("record.automaticThought") },
    {
      fields: ["emotions", "emotionIntensityBefore"],
      key: "emotions",
      title: t("record.emotions"),
    },
    { fields: ["evidenceFor", "evidenceAgainst"], key: "evidence", title: t("record.evidence") },
    { fields: ["distortions"], key: "distortions", title: t("record.patterns") },
    { fields: ["balancedThought"], key: "balancedThought", title: t("record.balancedThought") },
    {
      fields: ["emotionIntensityAfter", "outcomeNotes"],
      key: "outcome",
      title: t("record.outcome"),
    },
  ];

  const wizard = useWizardDraft({
    store: useCbtDraftStore,
    draftMode,
    entityId: recordId,
    stepFields: steps.map((s) => s.fields),
    form,
    onSave: (values) => {
      setSubmitError("");
      const input: ThoughtRecordFormSchema = {
        ...values,
        evidenceAgainst: cleanList(values.evidenceAgainst),
        evidenceFor: cleanList(values.evidenceFor),
        outcomeNotes: values.outcomeNotes.trim(),
      };
      return saveMutation.mutateAsync({ input, recordId: recordId ?? undefined });
    },
    onSaved: (saved) =>
      router.replace(`/modules/cbt/history/${saved.id}` as Parameters<typeof router.replace>[0]),
    onError: setSubmitError,
    toastLabels: {
      saved: t("common:feedback.saved"),
      problem: t("common:feedback.problem"),
      fallbackError: t("detail.archiveError"),
    },
  });

  const currentStep = steps[wizard.stepIndex];

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
    <WizardScreen
      title={recordId ? t("record.editTitle") : t("record.newTitle")}
      description={recordId ? t("record.editDescription") : t("record.newDescription")}
      steps={steps}
      stepIndex={wizard.stepIndex}
      numberedSteps
      onJumpToStep={wizard.goToStep}
      onBack={wizard.previousStep}
      onPrimary={() => void (wizard.isLastStep ? wizard.handleSave() : wizard.handleNext())}
      primaryLabel={wizard.isLastStep ? t("record.saveRecord") : t("record.continue")}
      pendingLabel={t("record.saving")}
      backLabel={t("record.back")}
      isPending={wizard.isPending}
      headerSlot={
        <>
          <CrisisSupportCallout />
          {submitError ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("record.saveProblem")}</CardTitle>
                <CardDescription>{submitError}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </>
      }
    >
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
    </WizardScreen>
  );
}
