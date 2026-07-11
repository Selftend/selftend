import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { NumberRating } from "@/src/components/app/number-rating";
import { EMOTION_GROUPS } from "@/src/constants/emotions";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";

interface EmotionsStepProps {
  control: Control<ThoughtRecordFormSchema>;
  errors: FieldErrors<ThoughtRecordFormSchema>;
}

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
          <View className="gap-2">
            <Label>{t("record.intensityBefore")}</Label>
            <Text variant="muted">{t("record.intensityBeforeHint")}</Text>
            <NumberRating min={0} max={100} step={10} value={value} onChange={onChange} />
          </View>
        )}
      />
    </View>
  );
}
