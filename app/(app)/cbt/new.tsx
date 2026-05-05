import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { distortionDefinitions } from "@/src/constants/distortions";
import { emotionOptions } from "@/src/constants/emotions";
import { useSaveThoughtRecord, useThoughtRecord } from "@/src/features/cbt/queries";
import { thoughtRecordFormSchema, type ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";
import { useSession } from "@/src/providers/session-provider";
import { useCbtDraftStore } from "@/src/stores/cbt-draft-store";

const defaultValues: ThoughtRecordFormSchema = {
  situation: "",
  automaticThought: "",
  emotions: [],
  distortions: [],
  balancedThought: "",
};

export default function ThoughtRecordEditorScreen() {
  const { t } = useTranslation("cbt");
  const { recordId: rawRecordId } = useLocalSearchParams<{ recordId?: string }>();
  const recordId = useMemo(
    () => (typeof rawRecordId === "string" && rawRecordId.length > 0 ? rawRecordId : null),
    [rawRecordId],
  );
  const { user } = useSession();
  const [submitError, setSubmitError] = useState("");
  const stepIndex = useCbtDraftStore((state) => state.stepIndex);
  const hydrateDraft = useCbtDraftStore((state) => state.hydrate);
  const nextStep = useCbtDraftStore((state) => state.nextStep);
  const previousStep = useCbtDraftStore((state) => state.previousStep);
  const resetDraft = useCbtDraftStore((state) => state.reset);
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
    defaultValues,
    resolver: zodResolver(thoughtRecordFormSchema),
  });

  useEffect(() => {
    hydrateDraft(recordId ? "edit" : "create", recordId);

    return () => {
      resetDraft();
    };
  }, [hydrateDraft, recordId, resetDraft]);

  useEffect(() => {
    if (!existingRecord) {
      return;
    }

    reset({
      automaticThought: existingRecord.automaticThought,
      balancedThought: existingRecord.balancedThought,
      distortions: existingRecord.distortions,
      emotions: existingRecord.emotions,
      situation: existingRecord.situation,
    });
  }, [existingRecord, reset]);

  const steps = [
    {
      description: t("record.situationHint"),
      fields: ["situation"] as const,
      title: t("record.situation"),
    },
    {
      description: t("record.automaticThoughtHint"),
      fields: ["automaticThought"] as const,
      title: t("record.automaticThought"),
    },
    {
      description: t("record.emotionsHint"),
      fields: ["emotions"] as const,
      title: t("record.emotions"),
    },
    {
      description: t("record.patternsHint"),
      fields: ["distortions"] as const,
      title: t("record.patterns"),
    },
    {
      description: t("record.balancedThoughtHint"),
      fields: ["balancedThought"] as const,
      title: t("record.balancedThought"),
    },
  ];

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const handleNext = async () => {
    const isValid = await trigger(currentStep.fields);
    if (isValid) {
      nextStep(steps.length - 1);
    }
  };

  const handleSave = handleSubmit(async (values) => {
    try {
      setSubmitError("");
      const saved = await saveMutation.mutateAsync({
        input: values,
        recordId: recordId ?? undefined,
      });
      resetDraft();
      router.replace(`/cbt/${saved.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t("detail.archiveError"));
    }
  });

  if (recordId && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Text variant="h1">{t("detail.loading")}</Text>
          <ActivityIndicator />
          <Text variant="muted">{t("detail.loadingDescription")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{recordId ? t("record.editTitle") : t("record.newTitle")}</Text>
            <Text variant="muted">
              {recordId ? t("record.editDescription") : t("record.newDescription")}
            </Text>
          </View>

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
          const isActive = stepIndex === index;
          return (
            <Button
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

      <Card>
        <CardHeader>
          <CardTitle>{currentStep.title}</CardTitle>
          <CardDescription>{currentStep.description}</CardDescription>
        </CardHeader>
      </Card>

      {stepIndex === 0 ? (
        <Controller
          control={control}
          name="situation"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("record.situation")}</Label>
              <Text variant="muted">{t("record.situationPlaceholder")}</Text>
              <Textarea
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("record.situationExample")}
                value={value}
              />
              {errors.situation?.message ? <Text variant="muted">{errors.situation.message}</Text> : null}
            </View>
          )}
        />
      ) : null}

      {stepIndex === 1 ? (
        <Controller
          control={control}
          name="automaticThought"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("record.automaticThought")}</Label>
              <Text variant="muted">{t("record.automaticThoughtPlaceholder")}</Text>
              <Textarea
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

      {stepIndex === 2 ? (
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
                const toggle = () => {
                  const nextValues = checked ? value.filter((item) => item !== emotion) : [...value, emotion];
                  onChange(nextValues);
                };
                const emotionKey = emotion.toLowerCase();
                return (
                  <View key={emotion} className="flex-row items-center gap-3">
                    <Checkbox checked={checked} onCheckedChange={toggle} />
                    <Label onPress={toggle}>{t(`emotions.${emotionKey}`)}</Label>
                  </View>
                );
              })}
              {errors.emotions?.message ? <Text variant="muted">{errors.emotions.message}</Text> : null}
            </View>
          )}
        />
      ) : null}

      {stepIndex === 3 ? (
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
                        <Checkbox checked={checked} onCheckedChange={toggle} />
                        <Label onPress={toggle}>{t(`distortions.${distortion.key}.title`)}</Label>
                      </View>
                      <CardDescription>{t(`distortions.${distortion.key}.shortDescription`)}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
              {errors.distortions?.message ? <Text variant="muted">{errors.distortions.message}</Text> : null}
            </View>
          )}
        />
      ) : null}

      {stepIndex === 4 ? (
        <View className="gap-6">
          <Controller
            control={control}
            name="balancedThought"
            render={({ field: { onBlur, onChange, value } }) => (
              <View className="gap-2">
                <Label>{t("record.balancedThoughtLabel")}</Label>
                <Text variant="muted">{t("record.balancedThoughtPlaceholder")}</Text>
                <Textarea
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
                <Text>{t("record.summarySituation", { value: getValues("situation") || t("record.summaryNotFilled") })}</Text>
                <Text>{t("record.summaryThought", { value: getValues("automaticThought") || t("record.summaryNotFilled") })}</Text>
                <Text>{t("record.summaryEmotions", { value: getValues("emotions").join(", ") || t("record.summaryNotFilled") })}</Text>
                <Text>{t("record.summaryPatterns", { value: getValues("distortions").join(", ") || t("record.summaryNotFilled") })}</Text>
              </View>
            </CardContent>
          </Card>
        </View>
      ) : null}
        </View>
      </ScrollView>
      <View className="border-t border-border bg-background p-4">
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
              {isSubmitting || saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>
                {isSubmitting || saveMutation.isPending ? t("record.saving") : isLastStep ? t("record.saveRecord") : t("record.continue")}
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
