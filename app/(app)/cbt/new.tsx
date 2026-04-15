import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/src/components/button";
import { Card } from "@/src/components/card";
import { ChipGroup } from "@/src/components/chip-group";
import { FieldShell } from "@/src/components/field-shell";
import { LoadingState } from "@/src/components/loading-state";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";
import { TextField } from "@/src/components/text-field";
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

const steps = [
  {
    description: "What happened, where were you, and what set the moment off?",
    fields: ["situation"] as const,
    title: "Situation",
  },
  {
    description: "Capture the first thought that showed up before you tried to soften it.",
    fields: ["automaticThought"] as const,
    title: "Automatic thought",
  },
  {
    description: "Choose the emotions that feel closest to the moment.",
    fields: ["emotions"] as const,
    title: "Emotions",
  },
  {
    description: "Notice which thinking patterns might be shaping the moment.",
    fields: ["distortions"] as const,
    title: "Patterns",
  },
  {
    description: "Write the calmer, more balanced response you want to keep.",
    fields: ["balancedThought"] as const,
    title: "Balanced thought",
  },
];

export default function ThoughtRecordEditorScreen() {
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
      setSubmitError(error instanceof Error ? error.message : "Unable to save the thought record.");
    }
  });

  if (recordId && isLoading) {
    return (
      <Screen scroll={false} title="Loading record">
        <LoadingState label="Preparing your existing record..." />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <View className="flex-row gap-3">
          {stepIndex > 0 ? (
            <View className="flex-1">
              <Button onPress={previousStep} text="Back" variant="ghost" />
            </View>
          ) : null}
          <View className="flex-1">
            <Button
              isLoading={isSubmitting || saveMutation.isPending}
              onPress={() => void (isLastStep ? handleSave() : handleNext())}
              text={isLastStep ? "Save record" : "Continue"}
            />
          </View>
        </View>
      }
      subtitle={recordId ? "Edit a saved record without losing its history." : "Walk through one thought in five small steps."}
      title={recordId ? "Edit thought record" : "New thought record"}
    >
      {submitError ? <NoticeCard body={submitError} title="Save problem" tone="warning" /> : null}

      <View className="flex-row flex-wrap gap-2">
        {steps.map((step, index) => {
          const isActive = stepIndex === index;
          return (
            <Pressable
              key={step.title}
              className={`rounded-full px-3 py-2 ${isActive ? "bg-pine" : "bg-white"}`}
              onPress={() => {
                if (index <= stepIndex) {
                  useCbtDraftStore.getState().setStepIndex(index);
                }
              }}
            >
              <Text className={isActive ? "text-sm font-semibold text-white" : "text-sm font-semibold text-ink/60"}>
                {index + 1}. {step.title}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card>
        <View className="gap-3">
          <Text className="text-2xl font-semibold text-ink">{currentStep.title}</Text>
          <Text className="text-sm leading-6 text-ink/70">{currentStep.description}</Text>
        </View>
      </Card>

      {stepIndex === 0 ? (
        <Controller
          control={control}
          name="situation"
          render={({ field: { onBlur, onChange, value } }) => (
            <FieldShell description="Keep it concrete. A few sentences is enough." error={errors.situation?.message} label="Situation">
              <TextField
                multiline
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Example: I saw an email from my manager and my chest tightened immediately."
                value={value}
              />
            </FieldShell>
          )}
        />
      ) : null}

      {stepIndex === 1 ? (
        <Controller
          control={control}
          name="automaticThought"
          render={({ field: { onBlur, onChange, value } }) => (
            <FieldShell
              description="Write the raw thought before you correct it."
              error={errors.automaticThought?.message}
              label="Automatic thought"
            >
              <TextField
                multiline
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Example: I am about to be told I messed everything up."
                value={value}
              />
            </FieldShell>
          )}
        />
      ) : null}

      {stepIndex === 2 ? (
        <Controller
          control={control}
          name="emotions"
          render={({ field: { onChange, value } }) => (
            <FieldShell description="Pick the feelings that fit best." error={errors.emotions?.message} label="Emotions">
              <ChipGroup
                onToggle={(nextEmotion) => {
                  const nextValues = value.includes(nextEmotion)
                    ? value.filter((item) => item !== nextEmotion)
                    : [...value, nextEmotion];
                  onChange(nextValues);
                }}
                options={emotionOptions}
                selected={value}
              />
            </FieldShell>
          )}
        />
      ) : null}

      {stepIndex === 3 ? (
        <Controller
          control={control}
          name="distortions"
          render={({ field: { onChange, value } }) => (
            <FieldShell
              description="Choose the patterns that seem closest. You can pick more than one."
              error={errors.distortions?.message}
              label="Thinking patterns"
            >
              <View className="gap-3">
                {distortionDefinitions.map((distortion) => {
                  const isSelected = value.includes(distortion.key);
                  return (
                    <Pressable
                      key={distortion.key}
                      className={`rounded-3xl border p-4 ${isSelected ? "border-pine bg-mist" : "border-black/10 bg-white"}`}
                      onPress={() => {
                        const nextValues = isSelected
                          ? value.filter((item) => item !== distortion.key)
                          : [...value, distortion.key];
                        onChange(nextValues);
                      }}
                    >
                      <View className="gap-2">
                        <Text className="text-base font-semibold text-ink">{distortion.title}</Text>
                        <Text className="text-sm leading-6 text-ink/70">{distortion.shortDescription}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </FieldShell>
          )}
        />
      ) : null}

      {stepIndex === 4 ? (
        <View className="gap-6">
          <Controller
            control={control}
            name="balancedThought"
            render={({ field: { onBlur, onChange, value } }) => (
              <FieldShell
                description="Aim for something believable and kinder, not forced positivity."
                error={errors.balancedThought?.message}
                label="Balanced thought"
              >
                <TextField
                  multiline
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Example: I do not know what the email means yet. One message is not proof that I failed."
                  value={value}
                />
              </FieldShell>
            )}
          />

          <Card>
            <View className="gap-3">
              <Text className="text-lg font-semibold text-ink">Summary before saving</Text>
              <SummaryRow label="Situation" value={getValues("situation")} />
              <SummaryRow label="Thought" value={getValues("automaticThought")} />
              <SummaryRow label="Emotions" value={getValues("emotions").join(", ")} />
              <SummaryRow label="Patterns" value={getValues("distortions").join(", ")} />
            </View>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1 rounded-2xl bg-mist px-4 py-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</Text>
      <Text className="text-sm leading-6 text-ink">{value || "Not filled yet."}</Text>
    </View>
  );
}
