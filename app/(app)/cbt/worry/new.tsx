import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { NumberRating } from "@/src/components/app/number-rating";
import { useSaveWorryEntry } from "@/src/features/worry/queries";
import { worryEntryFormSchema, type WorryEntryFormSchema } from "@/src/features/worry/schemas";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

const defaultValues: WorryEntryFormSchema = {
  worryStatement: "",
  worryCategory: "hypothetical",
  probabilityEstimate: 50,
  evidenceFor: [],
  evidenceAgainst: [],
  copingStatement: "",
  actionSteps: [],
};

export default function NewWorryScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const saveMutation = useSaveWorryEntry(user?.id ?? null);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setValue,
    watch,
  } = useForm<WorryEntryFormSchema>({
    defaultValues,
    resolver: zodResolver(worryEntryFormSchema),
  });

  const category = watch("worryCategory");
  const probability = watch("probabilityEstimate");
  const evidenceFor = watch("evidenceFor");
  const evidenceAgainst = watch("evidenceAgainst");
  const actionSteps = watch("actionSteps");

  const updateItem = (
    fieldName: "evidenceFor" | "evidenceAgainst" | "actionSteps",
    index: number,
    value: string,
  ) => {
    const current = watch(fieldName);
    const next = [...current];
    next[index] = value;
    setValue(fieldName, next);
  };
  const appendItem = (fieldName: "evidenceFor" | "evidenceAgainst" | "actionSteps") => {
    setValue(fieldName, [...watch(fieldName), ""]);
  };
  const removeItem = (
    fieldName: "evidenceFor" | "evidenceAgainst" | "actionSteps",
    index: number,
  ) => {
    setValue(
      fieldName,
      watch(fieldName).filter((_, i) => i !== index),
    );
  };

  const handleSave = handleSubmit(async (values) => {
    try {
      const sanitized: WorryEntryFormSchema = {
        ...values,
        evidenceFor: values.evidenceFor.filter((s) => s.trim().length > 0),
        evidenceAgainst: values.evidenceAgainst.filter((s) => s.trim().length > 0),
        actionSteps: values.actionSteps.filter((s) => s.trim().length > 0),
        probabilityEstimate:
          values.worryCategory === "hypothetical" ? values.probabilityEstimate : null,
        copingStatement: values.worryCategory === "hypothetical" ? values.copingStatement : "",
      };
      await saveMutation.mutateAsync(sanitized);
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace("/cbt/worry");
    } catch (e) {
      const message = e instanceof Error ? e.message : t("worry.saveError");
      showToast({ title: t("common:feedback.problem"), description: message, tone: "error" });
    }
  });

  const renderArrayInput = (
    label: string,
    hint: string,
    items: string[],
    fieldName: "evidenceFor" | "evidenceAgainst" | "actionSteps",
  ) => (
    <View className="gap-3">
      <Label>{label}</Label>
      <Text variant="muted">{hint}</Text>
      {items.map((value, index) => (
        <View key={`${fieldName}-${index}`} className="flex-row gap-2 items-start">
          <View className="flex-1">
            <Input
              accessibilityLabel={`${label} ${index + 1}`}
              onChangeText={(text) => updateItem(fieldName, index, text)}
              placeholder={t("worry.itemPlaceholder")}
              value={value}
            />
          </View>
          <Button onPress={() => removeItem(fieldName, index)} size="sm" variant="ghost">
            <Text>{t("worry.removeItem")}</Text>
          </Button>
        </View>
      ))}
      <Button onPress={() => appendItem(fieldName)} size="sm" variant="outline">
        <Text>{t("worry.addItem")}</Text>
      </Button>
    </View>
  );

  return (
    <MobileFormScreen
      footer={
        <Button disabled={isSubmitting || saveMutation.isPending} onPress={() => void handleSave()}>
          {isSubmitting || saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>
            {isSubmitting || saveMutation.isPending ? t("worry.saving") : t("worry.save")}
          </Text>
        </Button>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <Text variant="h1">{t("worry.newTitle")}</Text>
          <Text variant="muted">{t("worry.newDescription")}</Text>
        </View>

        <Controller
          control={control}
          name="worryStatement"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("worry.statementLabel")}</Label>
              <Textarea
                accessibilityLabel={t("worry.statementLabel")}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("worry.statementPlaceholder")}
                value={value}
              />
              {errors.worryStatement?.message ? (
                <Text className="text-sm text-destructive">{errors.worryStatement.message}</Text>
              ) : null}
            </View>
          )}
        />

        <View className="gap-2">
          <Label>{t("worry.categoryLabel")}</Label>
          <Text variant="muted">{t("worry.categoryHint")}</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                onPress={() => setValue("worryCategory", "hypothetical")}
                variant={category === "hypothetical" ? "default" : "outline"}
              >
                <Text>{t("worry.category.hypothetical")}</Text>
              </Button>
            </View>
            <View className="flex-1">
              <Button
                onPress={() => setValue("worryCategory", "real_problem")}
                variant={category === "real_problem" ? "default" : "outline"}
              >
                <Text>{t("worry.category.real_problem")}</Text>
              </Button>
            </View>
          </View>
        </View>

        {category === "hypothetical" ? (
          <View className="gap-6">
            <View className="gap-2">
              <Label>{t("worry.probability")}</Label>
              <Text variant="muted">{t("worry.probabilityHint")}</Text>
              <NumberRating
                max={100}
                min={0}
                step={10}
                value={probability}
                onChange={(n) => setValue("probabilityEstimate", n)}
              />
            </View>

            {renderArrayInput(
              t("worry.evidenceFor"),
              t("worry.evidenceForHint"),
              evidenceFor,
              "evidenceFor",
            )}
            {renderArrayInput(
              t("worry.evidenceAgainst"),
              t("worry.evidenceAgainstHint"),
              evidenceAgainst,
              "evidenceAgainst",
            )}

            <Controller
              control={control}
              name="copingStatement"
              render={({ field: { onBlur, onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("worry.copingStatement")}</Label>
                  <Text variant="muted">{t("worry.copingStatementHint")}</Text>
                  <Textarea
                    accessibilityLabel={t("worry.copingStatement")}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder={t("worry.copingStatementPlaceholder")}
                    value={value}
                  />
                  {errors.copingStatement?.message ? (
                    <Text className="text-sm text-destructive">
                      {errors.copingStatement.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />
          </View>
        ) : (
          <View className="gap-6">
            {renderArrayInput(
              t("worry.actionSteps"),
              t("worry.actionStepsHint"),
              actionSteps,
              "actionSteps",
            )}
            {errors.actionSteps?.message ? (
              <Text className="text-sm text-destructive">{errors.actionSteps.message}</Text>
            ) : null}
          </View>
        )}
      </View>
    </MobileFormScreen>
  );
}
