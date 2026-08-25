import { Controller, useWatch, type Control, type FieldErrors } from "react-hook-form";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { NumberRating } from "@/src/components/app/number-rating";
import { resolveHotThought } from "@/src/features/cbt/thought-record-form";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";

interface OutcomeStepProps {
  control: Control<ThoughtRecordFormSchema>;
  errors: FieldErrors<ThoughtRecordFormSchema>;
}

export function OutcomeStep({ control, errors }: OutcomeStepProps) {
  const { t } = useTranslation("cbt");
  // The belief question is about ONE thought, so this part has to say which.
  // The hot thought is whichever the user flagged - or, unflagged, the
  // highest-rated one - resolved from live form values so the quoted text
  // follows the choice as it changes further up the column.
  const nats = useWatch({ control, name: "nats" });
  const hotThought = resolveHotThought(nats ?? []);

  return (
    <View className="gap-6">
      {/* Belief comes first: it re-rates the thought, and the record's own order
          is thought before emotion everywhere else (the thoughts part precedes
          the feelings part). */}
      <Controller
        control={control}
        name="beliefAfter"
        render={({ field: { onChange, value } }) => (
          <View className="gap-2" testID="belief-after-rating">
            <Label>{t("record.beliefAfter")}</Label>
            {hotThought?.text ? <Text variant="muted">{hotThought.text}</Text> : null}
            <Text variant="muted">{t("record.beliefAfterHint")}</Text>
            {/* `?? null` because the schema is `.nullish()`: a draft persisted
                before this field existed restores with no value at all. */}
            <NumberRating min={0} max={100} step={10} value={value ?? null} onChange={onChange} />
          </View>
        )}
      />

      <Controller
        control={control}
        name="emotionIntensityAfter"
        render={({ field: { onChange, value } }) => (
          <View className="gap-2" testID="emotion-intensity-after-rating">
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
