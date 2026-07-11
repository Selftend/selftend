import { Pressable, View } from "react-native";
import { useState } from "react";
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
import { NumberRating } from "@/src/components/app/number-rating";
import type { NegativeAutomaticThought } from "@/src/features/cbt/types";

export function NatAddForm({ onAdd }: { onAdd: (nat: NegativeAutomaticThought) => void }) {
  const { t } = useTranslation("cbt");
  const [text, setText] = useState("");
  const [beliefRating, setBeliefRating] = useState<number | null>(null);

  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd({ text: text.trim(), beliefRating, isHotThought: false });
    setText("");
    setBeliefRating(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("record.addThought")}</CardTitle>
      </CardHeader>
      <CardContent>
        <View className="gap-3">
          <Textarea
            accessibilityLabel={t("record.nats")}
            onChangeText={setText}
            placeholder={t("record.natsPlaceholder")}
            value={text}
          />
          <Label>{t("record.beliefRating")}</Label>
          <Text variant="muted">{t("record.beliefRatingHint")}</Text>
          <NumberRating
            min={0}
            max={100}
            step={10}
            value={beliefRating}
            onChange={setBeliefRating}
          />
          <Pressable
            accessibilityRole="button"
            aria-disabled={!text.trim()}
            onPress={handleAdd}
            disabled={!text.trim()}
            className={`mt-1 ${!text.trim() ? "opacity-40" : ""}`}
          >
            <Text className="text-primary font-medium">{t("record.addThought")}</Text>
          </Pressable>
        </View>
      </CardContent>
    </Card>
  );
}
