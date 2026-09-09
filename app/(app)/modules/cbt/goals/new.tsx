import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Pressable, View } from "react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardHeader, CardTitle } from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { Input } from "@/src/components/react-native-reusables/input";
import { DateField } from "@/src/components/app/date-field";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { WizardScreen } from "@/src/components/app/wizard-screen";
import { goalTypes } from "@/src/constants/goal-types";
import { lifeDomains } from "@/src/constants/life-domains";
import { useGoal, useMilestones, useSaveGoal } from "@/src/features/goals/queries";
import {
  goalFormSchema,
  type GoalFormSchema,
  type GoalFormSeed,
} from "@/src/features/goals/schemas";
import { useValuesProfile } from "@/src/features/values/queries";
import { DEFAULT_INTERACTIVE_HIT_SLOP, enterKeyActivationProps } from "@/src/lib/accessibility";
import { useWizardDraft, selectWizardDraftValues } from "@/src/lib/use-wizard-draft";
import { useSession } from "@/src/providers/session-provider";
import { useGoalDraftStore } from "@/src/stores/goal-draft-store";

const defaultValues: GoalFormSeed = {
  lifeDomain: "",
  goalType: "",
  title: "",
  description: "",
  targetDate: null,
  valueKey: null,
  milestones: [{ description: "", targetDate: null }],
};

export default function NewGoalScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("cbt");
  const { goalId: rawGoalId } = useLocalSearchParams<{ goalId?: string }>();
  const goalId = typeof rawGoalId === "string" && rawGoalId.length > 0 ? rawGoalId : null;
  const draftMode = goalId ? "edit" : "create";
  const { user } = useSession();

  const storedDraftValues = useGoalDraftStore(
    selectWizardDraftValues<GoalFormSchema>(draftMode, goalId),
  );

  const { data: existingGoal, isLoading: goalLoading } = useGoal(user?.id ?? null, goalId);
  const { data: existingMilestones, isLoading: milestonesLoading } = useMilestones(
    user?.id ?? null,
    goalId,
  );
  const saveMutation = useSaveGoal(user?.id ?? null);

  const form = useForm<GoalFormSchema>({
    defaultValues: storedDraftValues ?? defaultValues,
    resolver: zodResolver(goalFormSchema),
  });
  const {
    control,
    formState: { errors },
    reset,
    setValue,
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: "milestones" });
  const selectedDomain = useWatch({ control, name: "lifeDomain" });
  const selectedType = useWatch({ control, name: "goalType" });
  const selectedValue = useWatch({ control, name: "valueKey" });

  // Reuse of the values screen's own query - there is deliberately no goal-side
  // query layer for this, and nothing here writes to the profile.
  const { data: valuesProfile, isLoading: valuesLoading } = useValuesProfile(user?.id ?? null);
  const priorityValues = valuesProfile?.priorityValues ?? [];
  // A value that has since dropped out of the priority list is still offered, and
  // still shown as selected: re-ranking on another screen must never silently
  // rewrite a goal that was anchored before the re-rank.
  const valueOptions =
    selectedValue && !priorityValues.includes(selectedValue)
      ? [...priorityValues, selectedValue]
      : priorityValues;
  // Shared between the values link's pointer press and its web Enter handler,
  // so the two paths cannot drift apart.
  const openValues = () => pushWithOrigin("/modules/cbt/values");

  useEffect(() => {
    if (!existingGoal || !existingMilestones || storedDraftValues) return;
    // Typed as the seed shape on purpose, so the compiler rejects a reset that
    // forgets `valueKey`. `saveGoal` overwrites every field of its payload, so
    // omitting it here would clear the anchor of every goal that has one the
    // first time it is edited.
    const seed: GoalFormSeed = {
      lifeDomain: existingGoal.lifeDomain,
      goalType: existingGoal.goalType,
      title: existingGoal.title,
      description: existingGoal.description,
      targetDate: existingGoal.targetDate,
      valueKey: existingGoal.valueKey,
      milestones:
        existingMilestones.length > 0
          ? existingMilestones.map((m) => ({
              description: m.description,
              targetDate: m.targetDate,
            }))
          : [{ description: "", targetDate: null }],
    };
    reset(seed);
  }, [existingGoal, existingMilestones, reset, storedDraftValues]);

  const steps: { title: string; fields: readonly (keyof GoalFormSchema)[] }[] = [
    { title: t("goals.step1"), fields: ["lifeDomain", "goalType", "valueKey"] },
    { title: t("goals.step2"), fields: ["title", "description", "targetDate"] },
    { title: t("goals.step3"), fields: ["milestones"] },
  ];

  const wizard = useWizardDraft({
    useDraftStore: useGoalDraftStore,
    draftMode,
    entityId: goalId,
    stepFields: steps.map((s) => s.fields),
    form,
    onSave: (values) =>
      saveMutation.mutateAsync({
        input: {
          title: values.title,
          description: values.description,
          lifeDomain: values.lifeDomain,
          goalType: values.goalType,
          targetDate: values.targetDate,
          // `?? null` covers a draft persisted before this field existed, which
          // rehydrates without the key at all - not a user choosing no value.
          valueKey: values.valueKey ?? null,
        },
        goalId: goalId ?? undefined,
        milestones: values.milestones,
      }),
    onSaved: (saved) =>
      router.replace(`/modules/cbt/goals/${saved.id}` as Parameters<typeof router.replace>[0]),
    toastLabels: {
      saved: t("common:feedback.saved"),
      problem: t("common:feedback.problem"),
      invalid: t("common:feedback.invalid"),
      invalidMoved: t("common:feedback.invalidMoved"),
      fallbackError: t("goals.saveError"),
    },
  });

  // Wait for the persisted draft to rehydrate before mounting the form, exactly
  // like the edit-mode data gate below - otherwise the wizard would flash empty.
  if (!wizard.hydrated || (goalId && (goalLoading || milestonesLoading))) {
    return <ScreenLoading title={t("goals.loading")} />;
  }

  return (
    <WizardScreen
      title={goalId ? t("goals.editTitle") : t("goals.newTitle")}
      description={goalId ? t("goals.editDescription") : t("goals.newDescription")}
      steps={steps}
      stepIndex={wizard.stepIndex}
      onJumpToStep={wizard.goToStep}
      onBack={wizard.previousStep}
      onPrimary={() => void (wizard.isLastStep ? wizard.handleSave() : wizard.handleNext())}
      primaryLabel={wizard.isLastStep ? t("goals.save") : t("goals.continue")}
      pendingLabel={t("goals.saving")}
      backLabel={t("goals.back")}
      isPending={wizard.isPending}
    >
      {wizard.stepIndex === 0 ? (
        <View className="gap-6">
          <View className="gap-3">
            <Label>{t("goals.lifeDomain")}</Label>
            <Text variant="muted">{t("goals.lifeDomainHint")}</Text>
            <View className="flex-row flex-wrap gap-2">
              {lifeDomains.map((domain) => (
                <Button
                  key={domain}
                  onPress={() => setValue("lifeDomain", domain)}
                  size="sm"
                  variant={selectedDomain === domain ? "default" : "outline"}
                >
                  <Text>{t(`goals.domain.${domain}`)}</Text>
                </Button>
              ))}
            </View>
            {errors.lifeDomain?.message ? (
              <Text className="text-sm text-destructive">{t(errors.lifeDomain.message)}</Text>
            ) : null}
          </View>

          <View className="gap-3">
            <Label>{t("goals.goalType")}</Label>
            <Text variant="muted">{t("goals.goalTypeHint")}</Text>
            <View className="flex-row flex-wrap gap-2">
              {goalTypes.map((type) => (
                <Button
                  key={type}
                  onPress={() => setValue("goalType", type)}
                  size="sm"
                  variant={selectedType === type ? "default" : "outline"}
                >
                  <Text>{t(`goals.type.${type}`)}</Text>
                </Button>
              ))}
            </View>
            {errors.goalType?.message ? (
              <Text className="text-sm text-destructive">{t(errors.goalType.message)}</Text>
            ) : null}
          </View>

          {/*
            Optional, and never a gate: the programme's first week sets goals before
            it clarifies values, so the intended path reaches this with nothing to
            pick from. Only the user's own ranked priority values are offered, in
            their order - never the full adjective list, which would turn a quick
            choice into a second sorting exercise.
          */}
          <View className="gap-3">
            <Label>{t("goals.value")}</Label>
            <Text variant="muted">{t("goals.valueHint")}</Text>
            {valuesLoading ? null : valueOptions.length > 0 ? (
              <>
                <View className="flex-row flex-wrap gap-2">
                  {valueOptions.map((key) => (
                    // Announced as a checkbox, not a button: unlike the two
                    // single-selects above, pressing a chosen value again clears
                    // it, and `aria-checked` is the only thing carrying that state
                    // to a screen reader - the fill alone does not. Same contract
                    // as the shared `SelectableChip`; the Button styling stays so
                    // the three questions on this step read as one group.
                    <Button
                      key={key}
                      accessibilityRole="checkbox"
                      aria-checked={selectedValue === key}
                      onPress={() => setValue("valueKey", selectedValue === key ? null : key)}
                      role="checkbox"
                      size="sm"
                      variant={selectedValue === key ? "default" : "outline"}
                    >
                      <Text>{t(`personalValues.${key}.label`)}</Text>
                    </Button>
                  ))}
                </View>
                {selectedValue ? (
                  <Button
                    className="self-start"
                    onPress={() => setValue("valueKey", null)}
                    size="sm"
                    variant="ghost"
                  >
                    <Text>{t("goals.valueClear")}</Text>
                  </Button>
                ) : null}
              </>
            ) : (
              // A quiet link, not an empty control and not a prompt to go and do
              // homework first. The wizard draft is persisted, so leaving for the
              // values screen and coming back keeps whatever has been filled in.
              <View className="gap-1">
                <Text variant="muted">{t("goals.valueEmpty")}</Text>
                <Pressable
                  accessibilityLabel={t("goals.valueEmptyLink")}
                  accessibilityRole="link"
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={openValues}
                  className="self-start"
                  role="link"
                  {...enterKeyActivationProps(openValues)}
                >
                  <Text className="text-sm text-primary underline">
                    {t("goals.valueEmptyLink")}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      ) : null}

      {wizard.stepIndex === 1 ? (
        <View className="gap-6">
          <Controller
            control={control}
            name="title"
            render={({ field: { onBlur, onChange, value } }) => (
              <View className="gap-2">
                <Label>{t("goals.titleLabel")}</Label>
                <Input
                  accessibilityLabel={t("goals.titleLabel")}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder={t("goals.titlePlaceholder")}
                  value={value}
                />
                {errors.title?.message ? (
                  <Text className="text-sm text-destructive">{t(errors.title.message)}</Text>
                ) : null}
              </View>
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onBlur, onChange, value } }) => (
              <View className="gap-2">
                <Label>{t("goals.descriptionLabel")}</Label>
                <Textarea
                  accessibilityLabel={t("goals.descriptionLabel")}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder={t("goals.descriptionPlaceholder")}
                  value={value}
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="targetDate"
            render={({ field: { onChange, value } }) => (
              <View className="gap-2">
                <Label>{t("goals.targetDate")}</Label>
                <Text variant="muted">{t("goals.targetDateHint")}</Text>
                <DateField
                  accessibilityLabel={t("goals.targetDate")}
                  onChange={onChange}
                  value={value}
                />
                {errors.targetDate?.message ? (
                  <Text className="text-sm text-destructive">{t(errors.targetDate.message)}</Text>
                ) : null}
              </View>
            )}
          />
        </View>
      ) : null}

      {wizard.stepIndex === 2 ? (
        <View className="gap-4">
          <View className="gap-2">
            <Label>{t("goals.milestonesLabel")}</Label>
            <Text variant="muted">{t("goals.milestonesHint")}</Text>
          </View>

          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardHeader>
                <CardTitle>{t("goals.milestone", { n: index + 1 })}</CardTitle>
              </CardHeader>
              <View className="gap-3 px-6 pb-6">
                <Controller
                  control={control}
                  name={`milestones.${index}.description`}
                  render={({ field: { onBlur, onChange, value } }) => (
                    <View className="gap-2">
                      <Label>{t("goals.milestoneDescription")}</Label>
                      <Input
                        accessibilityLabel={t("goals.milestoneDescription")}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        placeholder={t("goals.milestonePlaceholder")}
                        value={value}
                      />
                      {errors.milestones?.[index]?.description?.message ? (
                        <Text className="text-sm text-destructive">
                          {t(errors.milestones[index]!.description!.message)}
                        </Text>
                      ) : null}
                    </View>
                  )}
                />

                {/* ⚠️ `milestones.${index}.targetDate` has no Controller, and
                    that is deliberate — not an oversight to wire up on the way
                    past. A milestone is a step inside a goal that already has
                    one target date; a second date per step is more calendar than
                    the tool asks for. The field is round-tripped as null
                    everywhere (form default, append, reset, save), and every
                    `target_date` on `goal_milestones` in the database is null
                    and always has been. Giving it a date picker is a product
                    decision nobody has made (#1300). */}

                {fields.length > 1 ? (
                  <Button onPress={() => remove(index)} size="sm" variant="ghost">
                    <Text>{t("goals.removeMilestone")}</Text>
                  </Button>
                ) : null}
              </View>
            </Card>
          ))}

          <Button onPress={() => append({ description: "", targetDate: null })} variant="outline">
            <Text>{t("goals.addMilestone")}</Text>
          </Button>

          {errors.milestones?.message ? (
            <Text className="text-sm text-destructive">{t(errors.milestones.message)}</Text>
          ) : null}
        </View>
      ) : null}
    </WizardScreen>
  );
}
