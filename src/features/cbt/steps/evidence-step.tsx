import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { listToText, textToList } from "@/src/features/cbt/thought-record-form";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";

interface EvidenceStepProps {
  control: Control<ThoughtRecordFormSchema>;
  errors: FieldErrors<ThoughtRecordFormSchema>;
}

export function EvidenceStep({ control, errors }: EvidenceStepProps) {
  const { t } = useTranslation("cbt");

  return (
    <View className="gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("record.disputeTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="gap-1.5">
            {(
              [
                "disputePrompt1",
                "disputePrompt2",
                "disputePrompt3",
                "disputePrompt4",
                "disputePrompt5",
              ] as const
            ).map((key) => (
              <Text key={key} variant="muted" className="text-sm">
                {`• ${t(`record.${key}`)}`}
              </Text>
            ))}
          </View>
        </CardContent>
      </Card>

      <Controller
        control={control}
        name="evidenceFor"
        render={({ field: { onChange, value } }) => (
          <View className="gap-2">
            <Label>{t("record.evidenceForLabel")}</Label>
            <Text variant="muted">{t("record.evidenceForHint")}</Text>
            <Textarea
              accessibilityLabel={t("record.evidenceForLabel")}
              onChangeText={(text) => onChange(textToList(text))}
              placeholder={t("record.evidenceForPlaceholder")}
              value={listToText(value)}
            />
            {errors.evidenceFor ? (
              <Text variant="muted">{t("record.validation.evidenceTooLong")}</Text>
            ) : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="evidenceAgainst"
        render={({ field: { onChange, value } }) => (
          <View className="gap-2">
            <Label>{t("record.evidenceAgainstLabel")}</Label>
            <Text variant="muted">{t("record.evidenceAgainstHint")}</Text>
            <Textarea
              accessibilityLabel={t("record.evidenceAgainstLabel")}
              onChangeText={(text) => onChange(textToList(text))}
              placeholder={t("record.evidenceAgainstPlaceholder")}
              value={listToText(value)}
            />
            {errors.evidenceAgainst ? (
              <Text variant="muted">{t("record.validation.evidenceTooLong")}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}
