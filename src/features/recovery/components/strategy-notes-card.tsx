import { View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { type StrategyKey } from "@/src/features/cbt/strategies";

interface StrategyNotesCardProps {
  strategyKeys: StrategyKey[];
  notes: Record<string, string>;
  onChangeNote: (strategyKey: StrategyKey, value: string) => void;
}

/** Per-active-strategy integration notes. */
export function StrategyNotesCard({ strategyKeys, notes, onChangeNote }: StrategyNotesCardProps) {
  const { t } = useTranslation("cbt");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recovery.strategyNotes")}</CardTitle>
        <CardDescription>{t("recovery.strategyNotesHint")}</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        {strategyKeys.map((strategyKey) => {
          const label = t(`dashboard.strategies.${strategyKey}`);
          return (
            <View key={strategyKey} className="gap-2">
              <Label>{label}</Label>
              <Textarea
                accessibilityLabel={label}
                onChangeText={(value) => onChangeNote(strategyKey, value)}
                placeholder={t("recovery.strategyNotePlaceholder", { strategy: label })}
                value={notes[strategyKey] ?? ""}
              />
            </View>
          );
        })}
      </CardContent>
    </Card>
  );
}
