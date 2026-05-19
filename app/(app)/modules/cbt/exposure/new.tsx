import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, CardHeader, CardTitle } from "@/src/components/react-native-reusables/card";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Button } from "@/src/components/react-native-reusables/button";
import { NumberRating } from "@/src/components/app/number-rating";
import { WizardScreen } from "@/src/components/app/wizard-screen";
import { useSaveHierarchy } from "@/src/features/exposure/queries";
import {
  exposureHierarchyFormSchema,
  type ExposureHierarchyFormSchema,
} from "@/src/features/exposure/schemas";
import { useWizardDraft, selectWizardDraftValues } from "@/src/lib/use-wizard-draft";
import { useSession } from "@/src/providers/session-provider";
import { useExposureDraftStore } from "@/src/stores/exposure-draft-store";

const defaultValues: ExposureHierarchyFormSchema = {
  title: "",
  anxietyType: "",
  items: [{ description: "", sudsRating: 20 }],
};

export default function NewExposureHierarchyScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();

  const storedDraftValues = useExposureDraftStore(
    selectWizardDraftValues<ExposureHierarchyFormSchema>("create", null),
  );

  const saveMutation = useSaveHierarchy(user?.id ?? null);

  const form = useForm<ExposureHierarchyFormSchema>({
    defaultValues: storedDraftValues ?? defaultValues,
    resolver: zodResolver(exposureHierarchyFormSchema),
  });
  const {
    control,
    formState: { errors },
    setValue,
    watch,
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");

  const steps: { title: string; fields: readonly (keyof ExposureHierarchyFormSchema)[] }[] = [
    { title: t("exposure.step1"), fields: ["title", "anxietyType"] },
    { title: t("exposure.step2"), fields: ["items"] },
  ];

  const wizard = useWizardDraft({
    store: useExposureDraftStore,
    draftMode: "create",
    entityId: null,
    stepFields: steps.map((s) => s.fields),
    form,
    onSave: (values) =>
      saveMutation.mutateAsync({
        input: { title: values.title, anxietyType: values.anxietyType },
        items: values.items,
      }),
    onSaved: (saved) =>
      router.replace(`/modules/cbt/exposure/${saved.id}` as Parameters<typeof router.replace>[0]),
    toastLabels: {
      saved: t("common:feedback.saved"),
      problem: t("common:feedback.problem"),
      fallbackError: t("exposure.saveError"),
    },
  });

  return (
    <WizardScreen
      title={t("exposure.newTitle")}
      description={t("exposure.newDescription")}
      steps={steps}
      stepIndex={wizard.stepIndex}
      onJumpToStep={wizard.goToStep}
      onBack={wizard.previousStep}
      onPrimary={() => void (wizard.isLastStep ? wizard.handleSave() : wizard.handleNext())}
      primaryLabel={wizard.isLastStep ? t("exposure.save") : t("exposure.continue")}
      pendingLabel={t("exposure.saving")}
      backLabel={t("exposure.back")}
      isPending={wizard.isPending}
    >
      {wizard.stepIndex === 0 ? (
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

      {wizard.stepIndex === 1 ? (
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
    </WizardScreen>
  );
}
