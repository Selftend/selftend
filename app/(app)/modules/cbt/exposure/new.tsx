import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardHeader, CardTitle } from "@/src/components/react-native-reusables/card";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { NumberRating } from "@/src/components/app/number-rating";
import { useSaveHierarchy } from "@/src/features/exposure/queries";
import {
  exposureHierarchyFormSchema,
  type ExposureHierarchyFormSchema,
} from "@/src/features/exposure/schemas";
import { useSession } from "@/src/providers/session-provider";
import { useExposureDraftStore } from "@/src/stores/exposure-draft-store";
import { useToastStore } from "@/src/stores/toast-store";
import { BackButton } from "@/src/components/app/back-button";

const defaultValues: ExposureHierarchyFormSchema = {
  title: "",
  anxietyType: "",
  items: [{ description: "", sudsRating: 20 }],
};

export default function NewExposureHierarchyScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);

  const stepIndex = useExposureDraftStore((state) => state.stepIndex);
  const storedDraftValues = useExposureDraftStore((state) => state.values);
  const nextStep = useExposureDraftStore((state) => state.nextStep);
  const previousStep = useExposureDraftStore((state) => state.previousStep);
  const resetDraft = useExposureDraftStore((state) => state.reset);
  const setDraftValues = useExposureDraftStore((state) => state.setValues);

  const saveMutation = useSaveHierarchy(user?.id ?? null);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setValue,
    trigger,
    watch,
  } = useForm<ExposureHierarchyFormSchema>({
    defaultValues: storedDraftValues ?? defaultValues,
    resolver: zodResolver(exposureHierarchyFormSchema),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");

  const steps = [
    { title: t("exposure.step1"), fields: ["title", "anxietyType"] as const },
    { title: t("exposure.step2"), fields: ["items"] as const },
  ];

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const handleNext = async () => {
    const isValid = await trigger(
      currentStep.fields as unknown as (keyof ExposureHierarchyFormSchema)[],
    );
    if (isValid) nextStep(steps.length - 1);
  };

  const handleSave = handleSubmit(async (values) => {
    setDraftValues(values);
    try {
      const saved = await saveMutation.mutateAsync({
        input: { title: values.title, anxietyType: values.anxietyType },
        items: values.items,
      });
      resetDraft();
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace(`/modules/cbt/exposure/${saved.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("exposure.saveError");
      showToast({ title: t("common:feedback.problem"), description: message, tone: "error" });
    }
  });

  return (
    <MobileFormScreen
      footer={
        <View className="flex-row gap-3">
          {stepIndex > 0 ? (
            <View className="flex-1">
              <Button onPress={previousStep} variant="ghost">
                <Text>{t("exposure.back")}</Text>
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
                  ? t("exposure.saving")
                  : isLastStep
                    ? t("exposure.save")
                    : t("exposure.continue")}
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
            <Text variant="h1">{t("exposure.newTitle")}</Text>
          </View>
          <Text variant="muted">{t("exposure.newDescription")}</Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {steps.map((step, index) => {
            const isActive = stepIndex === index;
            return (
              <Button
                key={step.title}
                accessibilityState={{ disabled: index > stepIndex, selected: isActive }}
                disabled={index > stepIndex}
                onPress={() => {
                  if (index <= stepIndex) useExposureDraftStore.getState().setStepIndex(index);
                }}
                size="sm"
                variant={isActive ? "secondary" : "ghost"}
              >
                <Text>{step.title}</Text>
              </Button>
            );
          })}
        </View>

        {stepIndex === 0 ? (
          <View className="gap-6">
            <Controller
              control={control}
              name="title"
              render={({ field: { onBlur, onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("exposure.hierarchyTitle")}</Label>
                  <Input
                    accessibilityLabel={t("exposure.hierarchyTitle")}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder={t("exposure.hierarchyTitlePlaceholder")}
                    value={value}
                  />
                  {errors.title?.message ? (
                    <Text className="text-sm text-destructive">{errors.title.message}</Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="anxietyType"
              render={({ field: { onBlur, onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("exposure.anxietyType")}</Label>
                  <Text variant="muted">{t("exposure.anxietyTypeHint")}</Text>
                  <Input
                    accessibilityLabel={t("exposure.anxietyType")}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder={t("exposure.anxietyTypePlaceholder")}
                    value={value}
                  />
                  {errors.anxietyType?.message ? (
                    <Text className="text-sm text-destructive">{errors.anxietyType.message}</Text>
                  ) : null}
                </View>
              )}
            />
          </View>
        ) : null}

        {stepIndex === 1 ? (
          <View className="gap-4">
            <View className="gap-2">
              <Label>{t("exposure.itemsLabel")}</Label>
              <Text variant="muted">{t("exposure.itemsHint")}</Text>
            </View>

            {fields.map((field, index) => (
              <Card key={field.id}>
                <CardHeader>
                  <CardTitle>{t("exposure.itemNumber", { n: index + 1 })}</CardTitle>
                </CardHeader>
                <View className="gap-4 px-6 pb-6">
                  <Controller
                    control={control}
                    name={`items.${index}.description`}
                    render={({ field: { onBlur, onChange, value } }) => (
                      <View className="gap-2">
                        <Label>{t("exposure.itemDescription")}</Label>
                        <Input
                          accessibilityLabel={t("exposure.itemDescription")}
                          onBlur={onBlur}
                          onChangeText={onChange}
                          placeholder={t("exposure.itemDescriptionPlaceholder")}
                          value={value}
                        />
                        {errors.items?.[index]?.description?.message ? (
                          <Text className="text-sm text-destructive">
                            {errors.items[index]!.description!.message}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  />

                  <View className="gap-2">
                    <Label>{t("exposure.itemSuds")}</Label>
                    <Text variant="muted">{t("exposure.itemSudsHint")}</Text>
                    <NumberRating
                      max={100}
                      min={0}
                      step={10}
                      value={items?.[index]?.sudsRating ?? null}
                      onChange={(n) => setValue(`items.${index}.sudsRating`, n)}
                    />
                  </View>

                  {fields.length > 1 ? (
                    <Button onPress={() => remove(index)} size="sm" variant="ghost">
                      <Text>{t("exposure.removeItem")}</Text>
                    </Button>
                  ) : null}
                </View>
              </Card>
            ))}

            <Button onPress={() => append({ description: "", sudsRating: 20 })} variant="outline">
              <Text>{t("exposure.addItem")}</Text>
            </Button>

            {errors.items?.message ? (
              <Text className="text-sm text-destructive">{errors.items.message}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </MobileFormScreen>
  );
}
