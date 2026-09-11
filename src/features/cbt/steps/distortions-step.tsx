import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { CheckboxRow } from "@/src/components/app/checkbox-row";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { distortionDefinitions } from "@/src/constants/distortions";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";

interface DistortionsStepProps {
  control: Control<ThoughtRecordFormSchema>;
  errors: FieldErrors<ThoughtRecordFormSchema>;
}

/**
 * The seventeen patterns as rows, not cards (#2349).
 *
 * The block sits where it has always sat, before Evidence (#1224), and every
 * option is still on screen - what went is the per-card padding, border and
 * header, which measured a third of the block's height and which the Feelings
 * list one section above never wore. Both lists render `CheckboxRow` so the
 * two adjacent controls cannot drift into different shapes.
 */
export function DistortionsStep({ control, errors }: DistortionsStepProps) {
  const { t } = useTranslation("cbt");

  return (
    <Controller
      control={control}
      name="distortions"
      render={({ field: { onChange, value } }) => (
        <View className="gap-3">
          <View className="gap-2">
            <Label>{t("record.patternsLabel")}</Label>
            <Text variant="muted">{t("record.patternsChooseHint")}</Text>
          </View>
          <View className="gap-2">
            {distortionDefinitions.map((distortion) => {
              const checked = value.includes(distortion.key);
              return (
                <CheckboxRow
                  checked={checked}
                  description={t(`distortions.${distortion.key}.shortDescription`)}
                  key={distortion.key}
                  label={t(`distortions.${distortion.key}.title`)}
                  onToggle={() =>
                    onChange(
                      checked
                        ? value.filter((item) => item !== distortion.key)
                        : [...value, distortion.key],
                    )
                  }
                  testID={`pattern-row-${distortion.key}`}
                />
              );
            })}
          </View>
          {errors.distortions?.message ? (
            <Text variant="muted">{t(errors.distortions.message)}</Text>
          ) : null}
        </View>
      )}
    />
  );
}
