import { Controller, type Control, type FieldErrors, type UseFormGetValues } from "react-hook-form";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { ThoughtRecordSummaryCard } from "@/src/features/cbt/steps/thought-record-summary-card";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";

interface BalancedThoughtStepProps {
  control: Control<ThoughtRecordFormSchema>;
  errors: FieldErrors<ThoughtRecordFormSchema>;
  getValues: UseFormGetValues<ThoughtRecordFormSchema>;
}

export function BalancedThoughtStep({ control, errors, getValues }: BalancedThoughtStepProps) {
  const { t } = useTranslation("cbt");

  return (
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
              <Text variant="muted">{t(errors.balancedThought.message)}</Text>
            ) : null}
          </View>
        )}
      />

      <ThoughtRecordSummaryCard getValues={getValues} />
    </View>
  );
}
