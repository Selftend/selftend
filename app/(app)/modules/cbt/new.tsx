import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Pressable, View } from "react-native";
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
import { HelpButton } from "@/src/components/app/help-button";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { LoadingState } from "@/src/components/app/screen-state";
import { NumberRating } from "@/src/components/app/number-rating";
import { WizardScreen } from "@/src/components/app/wizard-screen";
import { distortionDefinitions } from "@/src/constants/distortions";
import { emotionOptions } from "@/src/constants/emotions";
import { useSaveThoughtRecord, useThoughtRecord } from "@/src/features/cbt/queries";
import { thoughtRecordFormSchema, type ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";
import type { NegativeAutomaticThought } from "@/src/features/cbt/types";
import { useWizardDraft, selectWizardDraftValues } from "@/src/lib/use-wizard-draft";
import { useSession } from "@/src/providers/session-provider";
import { useCbtDraftStore } from "@/src/stores/cbt-draft-store";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";

const defaultValues: ThoughtRecordFormSchema = {
  situation: "",
  nats: [],
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
  | "nats"
  | "hotThought"
  | "emotions"
  | "evidence"
  | "distortions"
  | "balancedThought"
  | "outcome";

function NatAddForm({ onAdd }: { onAdd: (nat: NegativeAutomaticThought) => void }) {
  const { t } = useTranslation("cbt");
  const [text, setText] = useState("");
  const [beliefRating, setBeliefRating] = useState<number | null>(null);

  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd({ text: text.trim(), beliefRating, isHotThought: false });
    setText("");
    setBeliefRating(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("record.addThought")}</CardTitle>
      </CardHeader>
      <CardContent>
        <View className="gap-3">
          <Textarea
            accessibilityLabel={t("record.nats")}
            onChangeText={setText}
            placeholder={t("record.natsPlaceholder")}
            value={text}
          />
          <Label>{t("record.beliefRating")}</Label>
          <Text variant="muted">{t("record.beliefRatingHint")}</Text>
          <NumberRating
            min={0}
            max={100}
            step={10}
            value={beliefRating}
            onChange={setBeliefRating}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !text.trim() }}
            onPress={handleAdd}
            disabled={!text.trim()}
            className={`mt-1 ${!text.trim() ? "opacity-40" : ""}`}
          >
            <Text className="text-primary font-medium">{t("record.addThought")}</Text>
          </Pressable>
        </View>
      </CardContent>
    </Card>
  );
}

export default function ThoughtRecordEditorScreen() {
  const { t } = useTranslation("cbt");
  const { recordId: rawRecordId } = useLocalSearchParams<{ recordId?: string }>();
  const recordId = typeof rawRecordId === "string" && rawRecordId.length > 0 ? rawRecordId : null;
  const draftMode = recordId ? "edit" : "create";
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
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
    setValue,
  } = form;

  useEffect(() => {
    if (!existingRecord || storedDraftValues) {
      return;
    }
    reset({
      nats: existingRecord.nats,
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
    { fields: ["nats"], key: "nats", title: t("record.nats") },
    { fields: ["nats"], key: "hotThought", title: t("record.hotThought") },
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
    useDraftStore: useCbtDraftStore,
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
      const inputWithDate = !recordId
        ? { ...input, createdAt: loggedAtForSelectedDate(selectedDate) }
        : input;
      return saveMutation.mutateAsync({ input: inputWithDate, recordId: recordId ?? undefined });
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

  const [natsError, setNatsError] = useState("");

  // When entering the hotThought step, auto-select the NAT with the
  // highest beliefRating (or first) if none are already marked.
  useEffect(() => {
    if (currentStep.key !== "hotThought") return;
    const nats = getValues("nats");
    if (nats.some((n) => n.isHotThought)) return;
    let bestIndex = 0;
    for (let i = 1; i < nats.length; i++) {
      if ((nats[i].beliefRating ?? -1) > (nats[bestIndex].beliefRating ?? -1)) {
        bestIndex = i;
      }
    }
    setValue(
      "nats",
      nats.map((n, i) => ({ ...n, isHotThought: i === bestIndex })),
    );
  }, [currentStep.key, getValues, setValue]);

  const handlePrimary = async () => {
    if (wizard.isLastStep) {
      await wizard.handleSave();
      return;
    }
    if (currentStep.key === "nats") {
      const hasThought = getValues("nats").some((n) => n.text.trim().length > 0);
      if (!hasThought) {
        setNatsError(t("record.natsRequired"));
        return;
      }
      setNatsError("");
    }
    await wizard.handleNext();
  };

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
      titleAction={<HelpButton helpKey="thoughtRecords" />}
      steps={steps}
      stepIndex={wizard.stepIndex}
      numberedSteps
      onJumpToStep={wizard.goToStep}
      onBack={wizard.previousStep}
      onPrimary={() => void handlePrimary()}
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

      {currentStep.key === "nats" ? (
        <Controller
          control={control}
          name="nats"
          render={({ field: { onChange, value } }) => (
            <View className="gap-4">
              <View className="gap-2">
                <Label>{t("record.nats")}</Label>
                <Text variant="muted">{t("record.natsHint")}</Text>
              </View>
              {value.map((nat, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{nat.text}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <View className="gap-2">
                      <Label>{t("record.beliefRating")}</Label>
                      <Text variant="muted">{t("record.beliefRatingHint")}</Text>
                      <NumberRating
                        min={0}
                        max={100}
                        step={10}
                        value={nat.beliefRating}
                        onChange={(rating) => {
                          const next = [...value];
                          next[index] = { ...nat, beliefRating: rating };
                          onChange(next);
                        }}
                      />
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => onChange(value.filter((_, i) => i !== index))}
                      >
                        <Text variant="muted">{t("record.removeThought")}</Text>
                      </Pressable>
                    </View>
                  </CardContent>
                </Card>
              ))}
              <NatAddForm
                onAdd={(nat) => {
                  onChange([...value, nat]);
                  setNatsError("");
                }}
              />
              {natsError ? <Text variant="muted">{natsError}</Text> : null}
            </View>
          )}
        />
      ) : null}

      {currentStep.key === "hotThought" ? (
        <Controller
          control={control}
          name="nats"
          render={({ field: { onChange, value } }) => (
            <View className="gap-4">
              <View className="gap-2">
                <Label>{t("record.hotThought")}</Label>
                <Text variant="muted">{t("record.hotThoughtInstruction")}</Text>
              </View>
              {value.map((nat, index) => (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  accessibilityLabel={nat.text}
                  accessibilityState={{ selected: nat.isHotThought }}
                  onPress={() =>
                    onChange(value.map((n, i) => ({ ...n, isHotThought: i === index })))
                  }
                >
                  <Card className={nat.isHotThought ? "border-primary border-2" : ""}>
                    <CardHeader>
                      <View className="flex-row items-center justify-between gap-3">
                        <CardTitle className="flex-1">{nat.text}</CardTitle>
                        {nat.isHotThought ? <Text>{t("record.hotThoughtBadge")} 🔥</Text> : null}
                      </View>
                      {nat.beliefRating !== null ? (
                        <CardDescription>
                          {t("record.beliefRating")}: {nat.beliefRating}%
                        </CardDescription>
                      ) : null}
                    </CardHeader>
                  </Card>
                </Pressable>
              ))}
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
                    value: (() => {
                      const nats = getValues("nats");
                      const hot = nats.find((n) => n.isHotThought) ?? nats[0];
                      return hot?.text || t("record.summaryNotFilled");
                    })(),
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
