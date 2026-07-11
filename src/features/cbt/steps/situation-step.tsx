import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Button } from "@/src/components/react-native-reusables/button";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";

interface SituationStepProps {
  control: Control<ThoughtRecordFormSchema>;
  errors: FieldErrors<ThoughtRecordFormSchema>;
  showIntro: boolean;
  onDismissIntro: () => void;
}

export function SituationStep({ control, errors, showIntro, onDismissIntro }: SituationStepProps) {
  const { t } = useTranslation("cbt");

  return (
    <View className="gap-4">
      {showIntro ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("record.intro.title")}</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            <Text variant="muted">{t("record.intro.body")}</Text>
            <Button className="self-start" size="sm" onPress={onDismissIntro}>
              <Text>{t("record.intro.dismiss")}</Text>
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <Controller
        control={control}
        name="situation"
        render={({ field: { onBlur, onChange, value } }) => (
          <View className="gap-2">
            <Label>{t("record.situation")}</Label>
            <Text variant="muted">{t("record.situationPlaceholder")}</Text>
            <Textarea
              accessibilityHint={t("record.situationHint")}
              accessibilityLabel={t("record.situation")}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={t("record.situationExample")}
              value={value}
            />
            {errors.situation?.message ? (
              <Text variant="muted">{t(errors.situation.message)}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}
