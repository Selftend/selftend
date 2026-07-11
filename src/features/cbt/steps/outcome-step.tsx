import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { NumberRating } from "@/src/components/app/number-rating";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";

interface OutcomeStepProps {
  control: Control<ThoughtRecordFormSchema>;
  errors: FieldErrors<ThoughtRecordFormSchema>;
}

export function OutcomeStep({ control, errors }: OutcomeStepProps) {
  const { t } = useTranslation("cbt");

  return (
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
            {errors.outcomeNotes?.message ? (
              <Text variant="muted">{t(errors.outcomeNotes.message)}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}
