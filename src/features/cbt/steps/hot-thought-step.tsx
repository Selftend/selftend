import { Controller, type Control } from "react-hook-form";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { markHotThought } from "@/src/features/cbt/thought-record-form";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";
import { spaceKeyActivationProps } from "@/src/lib/accessibility";

interface HotThoughtStepProps {
  control: Control<ThoughtRecordFormSchema>;
}

export function HotThoughtStep({ control }: HotThoughtStepProps) {
  const { t } = useTranslation("cbt");

  return (
    <Controller
      control={control}
      name="nats"
      render={({ field: { onChange, value } }) => (
        <View
          accessibilityLabel={t("record.hotThought")}
          accessibilityRole="radiogroup"
          className="gap-4"
          role="radiogroup"
        >
          <View className="gap-2">
            <Label>{t("record.hotThought")}</Label>
            <Text variant="muted">{t("record.hotThoughtInstruction")}</Text>
          </View>
          {value.map((nat, index) => (
            <Pressable
              key={index}
              accessibilityRole="radio"
              accessibilityLabel={nat.text}
              aria-checked={nat.isHotThought}
              onPress={() => onChange(markHotThought(value, index))}
              role="radio"
              {...spaceKeyActivationProps(() => onChange(markHotThought(value, index)))}
            >
              <Card className={nat.isHotThought ? "border-primary border-2" : ""}>
                <CardHeader>
                  <View className="flex-row items-center justify-between gap-3">
                    <CardTitle className="flex-1">{nat.text}</CardTitle>
                    {nat.isHotThought ? <Text>{t("record.hotThoughtBadge")} 🔥</Text> : null}
                  </View>
                  {nat.beliefRating !== null ? (
                    <CardDescription>
                      {t("record.beliefRating")}: {nat.beliefRating}%
                    </CardDescription>
                  ) : null}
                </CardHeader>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    />
  );
}
