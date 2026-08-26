import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Pressable, View } from "react-native";
import type { RefObject } from "react";
import type { TextInput } from "react-native";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { NumberRating } from "@/src/components/app/number-rating";
import { NatAddForm } from "@/src/features/cbt/steps/nat-add-form";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";

interface NatsStepProps {
  control: Control<ThoughtRecordFormSchema>;
  errors: FieldErrors<ThoughtRecordFormSchema>;
  natsError: string;
  onClearNatsError: () => void;
  /**
   * The add-a-thought textarea, so the save-time "at least one thought"
   * complaint can put focus (and, on web, scroll) where the fix goes (#1381).
   */
  inputRef?: RefObject<TextInput | null>;
}

export function NatsStep({
  control,
  errors,
  natsError,
  onClearNatsError,
  inputRef,
}: NatsStepProps) {
  const { t } = useTranslation("cbt");

  return (
    <Controller
      control={control}
      name="nats"
      render={({ field: { onChange, value } }) => (
        <View className="gap-4">
          <View className="gap-2">
            <Label>{t("record.nats")}</Label>
            <Text variant="muted">{t("record.natsHint")}</Text>
          </View>
          {value.map((nat, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{nat.text}</CardTitle>
              </CardHeader>
              <CardContent>
                <View className="gap-2">
                  <Label>{t("record.beliefRating")}</Label>
                  <Text variant="muted">{t("record.beliefRatingHint")}</Text>
                  {/*
                   * Several 0-100 ratings share this column, so a bare number
                   * names many buttons - tests scope by these testIDs rather
                   * than by position, which would silently retarget another
                   * rating the moment anything moves between them.
                   */}
                  <View testID={`nat-belief-rating-${index}`}>
                    <NumberRating
                      min={0}
                      max={100}
                      step={10}
                      value={nat.beliefRating}
                      onChange={(rating) => {
                        const next = [...value];
                        next[index] = { ...nat, beliefRating: rating };
                        onChange(next);
                      }}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onChange(value.filter((_, i) => i !== index))}
                  >
                    <Text variant="muted">{t("record.removeThought")}</Text>
                  </Pressable>
                </View>
              </CardContent>
            </Card>
          ))}
          <NatAddForm
            inputRef={inputRef}
            onAdd={(nat) => {
              onChange([...value, nat]);
              onClearNatsError();
            }}
          />
          {natsError ? <Text variant="muted">{natsError}</Text> : null}
          {/* The only per-item schema constraint is the 2000-char cap, so a
              fixed message is accurate; without it an overlong paste would
              silently block Continue. */}
          {errors.nats ? <Text variant="muted">{t("record.validation.natTooLong")}</Text> : null}
        </View>
      )}
    />
  );
}
