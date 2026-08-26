import { Controller, useWatch, type Control } from "react-hook-form";
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
import { markHotThought, resolveHotThought } from "@/src/features/cbt/thought-record-form";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";
import { spaceKeyActivationProps } from "@/src/lib/accessibility";

interface HotThoughtStepProps {
  control: Control<ThoughtRecordFormSchema>;
}

/**
 * The hot-thought choice, rendered only once there IS a choice: with fewer
 * than two thoughts the highest- (i.e. only-) rated one is hot by
 * construction, and a radiogroup with one option is noise (#1381).
 *
 * The selection is DERIVED until overridden: an unflagged list highlights the
 * highest-rated thought (`resolveHotThought`'s fallback), so the default
 * follows the ratings live as they change; a tap writes an explicit flag,
 * which then stays put. The save writes the same derivation down, so what is
 * highlighted here is what the record carries.
 */
export function HotThoughtStep({ control }: HotThoughtStepProps) {
  const { t } = useTranslation("cbt");
  // Watched OUTSIDE the Controller because the gate lives at the component
  // level: a Controller's render must return an element, never null.
  const watchedNats = useWatch({ control, name: "nats" });

  if ((watchedNats ?? []).length < 2) return null;

  return (
    <Controller
      control={control}
      name="nats"
      render={({ field: { onChange, value } }) => {
        const hot = resolveHotThought(value);
        return (
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
            {value.map((nat, index) => {
              const selected = nat === hot;
              return (
                <Pressable
                  key={index}
                  accessibilityRole="radio"
                  accessibilityLabel={nat.text}
                  aria-checked={selected}
                  onPress={() => onChange(markHotThought(value, index))}
                  role="radio"
                  {...spaceKeyActivationProps(() => onChange(markHotThought(value, index)))}
                >
                  <Card className={selected ? "border-primary border-2" : ""}>
                    <CardHeader>
                      <View className="flex-row items-center justify-between gap-3">
                        <CardTitle className="flex-1">{nat.text}</CardTitle>
                        {selected ? <Text>{t("record.hotThoughtBadge")} 🔥</Text> : null}
                      </View>
                      {nat.beliefRating !== null ? (
                        <CardDescription>
                          {t("record.beliefRating")}: {nat.beliefRating}%
                        </CardDescription>
                      ) : null}
                    </CardHeader>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        );
      }}
    />
  );
}
