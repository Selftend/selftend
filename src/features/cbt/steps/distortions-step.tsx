import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, CardDescription, CardHeader } from "@/src/components/react-native-reusables/card";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { distortionDefinitions } from "@/src/constants/distortions";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";

interface DistortionsStepProps {
  control: Control<ThoughtRecordFormSchema>;
  errors: FieldErrors<ThoughtRecordFormSchema>;
}

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
          {distortionDefinitions.map((distortion) => {
            const checked = value.includes(distortion.key);
            const title = t(`distortions.${distortion.key}.title`);
            const toggle = () => {
              const nextValues = checked
                ? value.filter((item) => item !== distortion.key)
                : [...value, distortion.key];
              onChange(nextValues);
            };
            return (
              <Card key={distortion.key}>
                <CardHeader>
                  <View className="flex-row items-center gap-3">
                    <Checkbox
                      accessibilityLabel={title}
                      checked={checked}
                      onCheckedChange={toggle}
                    />
                    <Label onPress={toggle}>{title}</Label>
                  </View>
                  <CardDescription>
                    {t(`distortions.${distortion.key}.shortDescription`)}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
          {errors.distortions?.message ? (
            <Text variant="muted">{t(errors.distortions.message)}</Text>
          ) : null}
        </View>
      )}
    />
  );
}
