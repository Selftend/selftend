import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";

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
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Text variant="h1">Loading record</Text>
          <ActivityIndicator />
          <Text variant="muted">Preparing your existing record...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{recordId ? "Edit thought record" : "New thought record"}</Text>
            <Text variant="muted">
              {recordId ? "Edit a saved record without losing its history." : "Walk through one thought in five small steps."}
            </Text>
          </View>

      {submitError ? (
        <Card>
          <CardHeader>
            <CardTitle>Save problem</CardTitle>
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
              <Label>Situation</Label>
              <Text variant="muted">Keep it concrete. A few sentences is enough.</Text>
              <Textarea
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Example: I saw an email from my manager and my chest tightened immediately."
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
              <Label>Automatic thought</Label>
              <Text variant="muted">Write the raw thought before you correct it.</Text>
              <Textarea
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Example: I am about to be told I messed everything up."
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
                <Label>Emotions</Label>
                <Text variant="muted">Pick the feelings that fit best.</Text>
              </View>
              {emotionOptions.map((emotion) => {
                const checked = value.includes(emotion);
                const toggle = () => {
                  const nextValues = checked ? value.filter((item) => item !== emotion) : [...value, emotion];
                  onChange(nextValues);
                };
                return (
                  <View key={emotion} className="flex-row items-center gap-3">
                    <Checkbox checked={checked} onCheckedChange={toggle} />
                    <Label onPress={toggle}>{emotion}</Label>
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
                <Label>Thinking patterns</Label>
                <Text variant="muted">Choose the patterns that seem closest. You can pick more than one.</Text>
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
                        <Label onPress={toggle}>{distortion.title}</Label>
                      </View>
                      <CardDescription>{distortion.shortDescription}</CardDescription>
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
                <Label>Balanced thought</Label>
                <Text variant="muted">Aim for something believable and kinder, not forced positivity.</Text>
                <Textarea
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Example: I do not know what the email means yet. One message is not proof that I failed."
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
              <CardTitle>Summary before saving</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="gap-3">
                <Text>Situation: {getValues("situation") || "Not filled yet."}</Text>
                <Text>Thought: {getValues("automaticThought") || "Not filled yet."}</Text>
                <Text>Emotions: {getValues("emotions").join(", ") || "Not filled yet."}</Text>
                <Text>Patterns: {getValues("distortions").join(", ") || "Not filled yet."}</Text>
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
                <Text>Back</Text>
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
                {isSubmitting || saveMutation.isPending ? "Saving record" : isLastStep ? "Save record" : "Continue"}
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
