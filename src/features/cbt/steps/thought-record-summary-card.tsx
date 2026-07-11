import { type UseFormGetValues } from "react-hook-form";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { formatDistortionLabels, formatEmotionLabels } from "@/src/features/cbt/format-labels";
import { resolveHotThought } from "@/src/features/cbt/thought-record-form";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";

interface ThoughtRecordSummaryCardProps {
  getValues: UseFormGetValues<ThoughtRecordFormSchema>;
}

export function ThoughtRecordSummaryCard({ getValues }: ThoughtRecordSummaryCardProps) {
  const { t } = useTranslation("cbt");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("record.summaryTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <View className="gap-3">
          <Text>
            {t("record.summarySituation", {
              value: getValues("situation") || t("record.summaryNotFilled"),
            })}
          </Text>
          <Text>
            {t("record.summaryThought", {
              value: resolveHotThought(getValues("nats"))?.text || t("record.summaryNotFilled"),
            })}
          </Text>
          <Text>
            {t("record.summaryEmotions", {
              value: formatEmotionLabels(getValues("emotions"), t) || t("record.summaryNotFilled"),
            })}
          </Text>
          <Text>
            {t("record.summaryPatterns", {
              value:
                formatDistortionLabels(getValues("distortions"), t) || t("record.summaryNotFilled"),
            })}
          </Text>
        </View>
      </CardContent>
    </Card>
  );
}
