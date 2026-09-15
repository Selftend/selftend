import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { CheckboxRow } from "@/src/components/app/checkbox-row";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { NumberRating } from "@/src/components/app/number-rating";
import { EMOTION_GROUPS } from "@/src/constants/emotions";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";

interface EmotionsStepProps {
  control: Control<ThoughtRecordFormSchema>;
  errors: FieldErrors<ThoughtRecordFormSchema>;
}

/**
 * ☠️ The twenty-two feelings and the seventeen patterns one section below are
 * the same control, so they render the same `CheckboxRow` (#2349). Changing
 * the row here changes it there; shipping one row shape above a different one
 * is the defect the shared component exists to prevent.
 */
export function EmotionsStep({ control, errors }: EmotionsStepProps) {
  const { t } = useTranslation("cbt");

  return (
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
            {EMOTION_GROUPS.map((group) => (
              <View key={group.valence} className="gap-2">
                <Label>
                  {group.valence === "difficult"
                    ? t("emotions.groupDifficult")
                    : t("emotions.groupPleasant")}
                </Label>
                {group.ids.map((emotion) => {
                  const checked = value.includes(emotion);
                  const emotionKey = emotion.toLowerCase();
                  return (
                    <CheckboxRow
                      checked={checked}
                      key={emotion}
                      label={t(`emotions.${emotionKey}`)}
                      onToggle={() =>
                        onChange(
                          checked ? value.filter((item) => item !== emotion) : [...value, emotion],
                        )
                      }
                      testID={`emotion-row-${emotionKey}`}
                    />
                  );
                })}
              </View>
            ))}
            {errors.emotions?.message ? (
              <Text variant="muted">{t(errors.emotions.message)}</Text>
            ) : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="emotionIntensityBefore"
        render={({ field: { onChange, value } }) => (
          <View className="gap-2" testID="emotion-intensity-before-rating">
            <Label>{t("record.intensityBefore")}</Label>
            <Text variant="muted">{t("record.intensityBeforeHint")}</Text>
            <NumberRating min={0} max={100} step={10} value={value} onChange={onChange} />
          </View>
        )}
      />
    </View>
  );
}
